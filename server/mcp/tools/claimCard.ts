import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";
import { dispatchWebhooks } from "../../utils/webhooks";
import {
  requireUserId,
  requireWriteAccess,
  requireCard,
  requireId,
  cardIdInput,
  serializeCard,
} from "../../utils/mcpHelpers";

const db = setupDatabase();

export default defineMcpTool({
  name: "claimCard",
  title: "Claim a card to work on",
  description:
    "Atomically take ownership of a card by assigning it to yourself, so two agents (or an agent and a human) never work the same card. Succeeds only if the card is unassigned — or already yours. Returns claimed=true if you now hold it, or claimed=false with heldBy telling you who does; in that case skip the card and take another. Call releaseCard if you abandon it unfinished.",
  annotations: {
    readOnlyHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: { ...cardIdInput },
  inputExamples: [{ cardId: 1 }],
  handler: async ({ cardId, cardID }) => {
    const userId = requireUserId();
    requireWriteAccess();
    const id = requireId(cardId, cardID, "cardId");
    const { card: before, board } = await requireCard(id, userId, "edit");
    // Only a card that wasn't already held changes hands; re-claiming your own
    // is a no-op and must not re-broadcast/re-fire webhooks.
    const wasUnassigned = !before.assignee;

    // The WHERE clause makes this the atomic bit: only an unassigned card can be
    // taken. Re-read afterwards to learn the truth (MySQL reports 0 affected
    // rows when the value is unchanged, e.g. it was already ours).
    await db.execute(
      "UPDATE cards SET assignee = ? WHERE id = ? AND assignee IS NULL",
      [userId, id],
    );
    const [rows]: any = await db.execute(
      `SELECT c.*, u.name AS assigneeName, u.type AS assigneeType
       FROM cards c LEFT JOIN \`user\` u ON u.id = c.assignee WHERE c.id = ?`,
      [id],
    );
    const card = rows[0];
    const claimed = card.assignee === userId;

    if (claimed && wasUnassigned) {
      const serverSocket = getServerSocket();
      if (serverSocket) {
        serverSocket.to(`board-${board.id}`).emit("updateCard", {
          boardId: board.id,
          attachments: [],
          card: { ...card, status: !!card.status },
        });
      }
    }

    if (claimed && wasUnassigned) {
      dispatchWebhooks({
        boardId: board.id,
        event: "card.claimed",
        actorUserId: userId,
        card: serializeCard(card),
      });
    }

    return jsonResult({
      claimed,
      card: serializeCard(card),
      heldBy: card.assignee
        ? {
            userId: card.assignee,
            name: card.assigneeName ?? null,
            type: card.assigneeType ?? "human",
          }
        : null,
    });
  },
});
