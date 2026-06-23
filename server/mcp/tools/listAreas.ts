import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "listAreas",
  description: "List all areas for a specific board",
  annotations: {
    readOnlyHint: true,
  },
  inputSchema: {
    boardID: z.number().describe("The id of the board"),
  },
  handler: async ({ boardID }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!boardID) {
      return textResult("boardID required.");
    }

    if (!userId) {
      return textResult(
        "Authentication required. Please provide a valid API key.",
      );
    }

    try {
      // Check if the board exists
      const [boardRows] = await db.execute(
        "SELECT * FROM boards WHERE id = ?",
        [boardID],
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

      // Fetch areas for the board
      const [rows] = await db.execute(
        "SELECT * FROM areas WHERE board = ? ORDER BY sort ASC",
        [boardID],
      );

      return jsonResult({ areas: rows });
    } catch (error) {
      logger.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
