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
} from "../../utils/mcpHelpers";

const db = setupDatabase();

export default defineMcpTool({
  name: "writeComment",
  title: "Comment on a card",
  description:
    "Add a comment to a card, authored by the current user. `content` is Markdown. Collaborators are notified. Needs edit access to the board.",
  annotations: { readOnlyHint: false, openWorldHint: false },
  inputSchema: {
    ...cardIdInput,
    content: z.string().min(1).describe("The comment body, in Markdown."),
  },
  inputExamples: [
    { cardId: 1, content: "Looks good — can we try a **darker** blue?" },
  ],
  handler: async ({ cardId, cardID, content }) => {
    const userId = requireUserId();
    requireWriteAccess();
    const id = requireId(cardId, cardID, "cardId");
    const { card, board } = await requireCard(id, userId, "edit");

    const [result]: any = await db.execute(
      "INSERT INTO comments (card, user, content) VALUES (?, ?, ?)",
      [id, userId, content],
    );
    const [rows]: any = await db.execute(
      "SELECT comments.*, user.name AS userName, user.image AS userImage FROM comments LEFT JOIN user ON comments.user = user.id WHERE comments.id = ?",
      [result.insertId],
    );
    const row = rows[0];
    const comment = {
      id: row.id,
      card: row.card,
      user: row.user,
      userImage: row.userImage,
      userName: row.userName || "Unknown User",
      content: row.content,
      date: row.date,
    };

    const serverSocket = getServerSocket();
    if (serverSocket) {
      serverSocket.to(`card-${id}`).emit("addComment", { comment, cardID: id });
    }

    // Notify the board owner + collaborators (except the commenter).
    const [invited]: any = await db.execute(
      "SELECT user FROM invitations WHERE board = ?",
      [board.id],
    );
    for (const notifyUserId of [
      board.user,
      ...invited.map((i: any) => i.user),
    ].filter(Boolean)) {
      if (notifyUserId !== userId) {
        await db.execute(
          "INSERT INTO notifications (userId, type, boardId, cardId, message) VALUES (?, ?, ?, ?, ?)",
          [
            notifyUserId,
            "comment",
            board.id,
            id,
            `New comment by "${comment.userName}" on card "${card.name}"`,
          ],
        );
      }
    }

    dispatchWebhooks({
      boardId: board.id,
      event: "comment.created",
      actorUserId: userId,
      card: { id, name: card.name },
      comment: { id: comment.id, content: comment.content ?? "" },
    });

    return jsonResult({
      comment: {
        id: comment.id,
        cardId: comment.card,
        authorId: comment.user,
        authorName: comment.userName,
        content: comment.content ?? "",
        date: comment.date ? new Date(comment.date).toISOString() : null,
      },
    });
  },
});
