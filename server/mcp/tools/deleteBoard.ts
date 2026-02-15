import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "deleteBoard",
  description: "Delete a board and all its associated data",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    boardId: z.number().describe("The id of the board to delete"),
  },
  handler: async ({ boardId }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!boardId) {
      return textResult("boardId is required.");
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
        [boardId],
      );
      const board = boardRows[0];

      if (!board) {
        return textResult("Board not found.");
      }

      // Check if the user has permission to delete the board
      if (board.user !== userId) {
        return textResult("You don't have permission to delete this board.");
      }

      // Delete all invitations associated with the board
      await db.execute("DELETE FROM invitations WHERE board = ?", [boardId]);

      // Delete all notifications associated with the cards in the board's areas
      await db.execute("DELETE FROM notifications WHERE boardId = ?", [
        boardId,
      ]);

      // Delete all cards associated with the board's areas
      await db.execute(
        "DELETE FROM cards WHERE area IN (SELECT id FROM areas WHERE board = ?)",
        [boardId],
      );

      // Delete all areas associated with the board
      await db.execute("DELETE FROM areas WHERE board = ?", [boardId]);

      // Delete the board
      const [result] = await db.execute("DELETE FROM boards WHERE id = ?", [
        boardId,
      ]);

      if (result.affectedRows === 0) {
        return textResult("Board not found or already deleted.");
      }

      return jsonResult({ message: "Board deleted successfully" });
    } catch (error) {
      console.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
