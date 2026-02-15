import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "writeComment",
  description: "Create a new comment on a card",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    cardID: z.number().describe("The id of the card"),
    content: z.string().describe("The content of the comment"),
  },
  handler: async ({ cardID, content }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!cardID || !content) {
      return textResult("cardID and content are required.");
    }

    if (!userId) {
      return textResult(
        "Authentication required. Please provide a valid API key.",
      );
    }

    try {
      // Check if the card exists
      const [cardRows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardID,
      ]);
      const card = cardRows[0];

      if (!card) {
        return textResult("Card not found.");
      }

      // Get the board information
      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

      if (!board) {
        return textResult("Board not found.");
      }

      // Check if the user has write access to the board
      let writeAccess = false;
      if (board.status === "private" && board.user !== userId) {
        // Check if the user has an invitation
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length > 0) {
          writeAccess = invitationRows[0].permission === "edit";
        }
      } else if (board.user === userId) {
        // User is the creator of the board, so they have write access
        writeAccess = true;
      } else if (board.status === "public") {
        writeAccess = true;
      }

      if (!writeAccess) {
        return textResult("Unauthorized access.");
      }

      // Create new comment
      const [result] = await db.execute(
        "INSERT INTO comments (card, user, content) VALUES (?, ?, ?)",
        [cardID, userId, content],
      );

      // Fetch the created comment with user information
      const [rows] = await db.execute(
        "SELECT comments.*, user.name AS userName, user.image AS userImage FROM comments LEFT JOIN user ON comments.user = user.id WHERE comments.id = ?",
        [result.insertId],
      );

      const comment = rows[0]
        ? {
            id: rows[0].id,
            card: rows[0].card,
            user: rows[0].user,
            userImage: rows[0].userImage,
            userName: rows[0].userName || "Unknown User",
            content: rows[0].content,
            date: rows[0].date,
          }
        : null;

      // Get board information for notifications
      const [boardInfoRows] = await db.execute(
        "SELECT user, id AS boardId FROM boards WHERE id = (SELECT board FROM areas WHERE id = (SELECT area FROM cards WHERE id = ?))",
        [cardID],
      );
      const boardOwner = boardInfoRows[0]?.user;
      const boardId = boardInfoRows[0]?.boardId;

      // Fetch all users who have access to the board (owner and invited users)
      const [invitedUsers] = await db.execute(
        "SELECT user FROM invitations WHERE board = (SELECT board FROM areas WHERE id = (SELECT area FROM cards WHERE id = ?))",
        [cardID],
      );

      // Create notifications for the board owner and invited users
      const usersToNotify = [
        boardOwner,
        ...invitedUsers.map((inv) => inv.user),
      ].filter(Boolean);

      // Fetch the card name for the notification message
      const [cardNameRows] = await db.execute(
        "SELECT name FROM cards WHERE id = ?",
        [cardID],
      );

      for (const userId of usersToNotify) {
        if (userId !== userId) {
          // Don't notify the user who created the comment
          await db.execute(
            "INSERT INTO notifications (userId, type, boardId, cardId, message) VALUES (?, ?, ?, ?, ?)",
            [
              userId,
              "comment",
              boardId,
              cardID,
              `New comment by "${rows[0].userName}" on card "${cardNameRows[0]?.name || "a card"}": ${rows[0].content}`,
            ],
          );
        }
      }

      return jsonResult({ comment });
    } catch (error) {
      console.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
