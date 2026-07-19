import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";
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
  name: "releaseCard",
  title: "Release a claimed card",
  description:
    "Give up a card you claimed (clears the assignee) so someone else can pick it up. Only releases a card currently assigned to you — releasing someone else's card does nothing and returns released=false. Call this if you abandon a task without finishing it.",
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
    const { card, board } = await requireCard(id, userId, "edit");

    const wasMine = card.assignee === userId;
    if (wasMine) {
      await db.execute(
        "UPDATE cards SET assignee = NULL WHERE id = ? AND assignee = ?",
        [id, userId],
      );
    }
    const [rows]: any = await db.execute("SELECT * FROM cards WHERE id = ?", [
      id,
    ]);
    const updated = rows[0];

    if (wasMine) {
      const serverSocket = getServerSocket();
      if (serverSocket) {
        serverSocket.to(`board-${board.id}`).emit("updateCard", {
          boardId: board.id,
          attachments: [],
          card: { ...updated, status: !!updated.status },
        });
      }
    }

    return jsonResult({ released: wasMine, card: serializeCard(updated) });
  },
});
