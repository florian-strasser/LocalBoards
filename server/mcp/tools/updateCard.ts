import { z } from "zod";
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
  McpError,
} from "../../utils/mcpHelpers";

const db = setupDatabase();

export default defineMcpTool({
  name: "updateCard",
  title: "Update a card",
  description:
    "Update fields of an existing card. Only the fields you pass are changed (partial update); pass at least one. `content` is Markdown. Set `dueDate` to an empty string to clear it, and `assigneeId` to an empty string to unassign. Needs edit access to the board.",
  annotations: {
    readOnlyHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    ...cardIdInput,
    name: z.string().min(1).optional().describe("New card title."),
    content: z
      .string()
      .optional()
      .describe("New description, in Markdown. Pass '' to clear it."),
    done: z
      .boolean()
      .optional()
      .describe("Mark the card done (true) or open (false)."),
    status: z.boolean().optional().describe("Deprecated alias for done."),
    dueDate: z
      .string()
      .optional()
      .describe(
        "Due date as ISO 8601 (e.g. 2026-08-01T09:00:00Z), or '' to clear.",
      ),
    assigneeId: z
      .string()
      .optional()
      .describe(
        "User id to assign (must be a board member; from listBoardMembers), or '' to unassign.",
      ),
  },
  inputExamples: [
    { cardId: 1, done: true },
    {
      cardId: 2,
      name: "Redesign the logo",
      content: "Keep it **simple**.\n\n- [ ] first pass",
    },
    { cardId: 3, dueDate: "2026-08-01T09:00:00Z", assigneeId: "u-ben" },
  ],
  handler: async ({
    cardId,
    cardID,
    name,
    content,
    done,
    status,
    dueDate,
    assigneeId,
  }) => {
    const userId = requireUserId();
    requireWriteAccess();
    const id = requireId(cardId, cardID, "cardId");
    const { card, board } = await requireCard(id, userId, "edit");

    const doneVal = done ?? status;
    const fields: string[] = [];
    const values: any[] = [];
    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if (content !== undefined) {
      fields.push("content = ?");
      values.push(content);
    }
    if (doneVal !== undefined) {
      fields.push("status = ?");
      values.push(doneVal ? 1 : 0);
    }
    if (dueDate !== undefined) {
      if (dueDate === "") {
        fields.push("dueDate = ?");
        values.push(null);
      } else {
        const d = new Date(dueDate);
        if (Number.isNaN(d.getTime())) {
          throw new McpError(
            "VALIDATION",
            "dueDate must be an ISO 8601 date or ''.",
          );
        }
        fields.push("dueDate = ?");
        values.push(d);
      }
    }
    if (assigneeId !== undefined) {
      if (assigneeId === "") {
        fields.push("assignee = ?");
        values.push(null);
      } else {
        const [[member]]: any = await db.query(
          "SELECT 1 AS ok FROM boards WHERE id = ? AND user = ? UNION SELECT 1 AS ok FROM invitations WHERE board = ? AND user = ? LIMIT 1",
          [board.id, assigneeId, board.id, assigneeId],
        );
        if (!member) {
          throw new McpError(
            "VALIDATION",
            `assigneeId '${assigneeId}' is not a member of this board (see listBoardMembers).`,
          );
        }
        fields.push("assignee = ?");
        values.push(assigneeId);
      }
    }

    if (fields.length === 0) {
      throw new McpError("VALIDATION", "Provide at least one field to update.");
    }

    await db.execute(`UPDATE cards SET ${fields.join(", ")} WHERE id = ?`, [
      ...values,
      id,
    ]);

    // A changed due date means the reminders should fire again — the same rule
    // the web app applies (server/api/data/card.ts), otherwise a card
    // rescheduled by an agent silently never reminds anyone again.
    if (dueDate !== undefined) {
      await db.execute(
        "UPDATE card_reminders SET notified = 0 WHERE card = ?",
        [id],
      );
    }

    const [rows]: any = await db.execute("SELECT * FROM cards WHERE id = ?", [
      id,
    ]);
    const updatedCard = rows[0];

    // Notify collaborators when the done state actually changed.
    if (doneVal !== undefined && !!card.status !== !!doneVal) {
      const [invited]: any = await db.execute(
        "SELECT user FROM invitations WHERE board = ?",
        [board.id],
      );
      const usersToNotify = [
        board.user,
        ...invited.map((i: any) => i.user),
      ].filter(Boolean);
      const statusText = doneVal ? "completed" : "reopened";
      for (const notifyUserId of usersToNotify) {
        if (notifyUserId !== userId) {
          await db.execute(
            "INSERT INTO notifications (userId, type, boardId, cardId, message) VALUES (?, ?, ?, ?, ?)",
            [
              notifyUserId,
              "card_status_changed",
              board.id,
              updatedCard.id,
              `Card "${updatedCard.name}" was ${statusText}`,
            ],
          );
        }
      }
    }

    const serverSocket = getServerSocket();
    if (serverSocket) {
      serverSocket.to(`board-${board.id}`).emit("updateCard", {
        boardId: board.id,
        attachments: [],
        card: { ...updatedCard, status: !!updatedCard.status },
      });
    }

    dispatchWebhooks({
      boardId: board.id,
      event: "card.updated",
      actorUserId: userId,
      card: serializeCard(updatedCard),
    });

    return jsonResult({ card: serializeCard(updatedCard) });
  },
});
