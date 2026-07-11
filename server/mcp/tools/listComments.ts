import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "listComments",
  description: "List all comments for a specific card",
  annotations: {
    readOnlyHint: true,
  },
  inputSchema: {
    cardID: z.number().describe("The id of the card"),
  },
  handler: async ({ cardID }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!cardID) {
      return textResult("cardID required.");
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

      // Check if the user has access to the board
      let readAccess = false;
      if (board.status === "private" && board.user !== userId) {
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length > 0) {
          readAccess = true;
        }
      } else if (board.user === userId) {
        readAccess = true;
      } else if (board.status === "public") {
        readAccess = true;
      }

      if (!readAccess) {
        return textResult("Unauthorized access.");
      }

      // Fetch comments for the card with user information
      const [rows] = await db.execute(
        "SELECT comments.id AS id, comments.card AS card, comments.user AS user, COALESCE(user.name, comments.authorName) AS userName, user.image AS image, comments.content AS content, comments.date AS date FROM comments LEFT JOIN user ON comments.user = user.id WHERE comments.card = ? ORDER BY comments.date DESC",
        [cardID],
      );

      const comments = rows.map((row) => ({
        id: row.id,
        card: row.card,
        user: row.user,
        userImage: row.image,
        userName: row.userName || "Unknown User",
        content: row.content,
        date: row.date,
      }));

      return jsonResult({ comments });
    } catch (error) {
      logger.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
