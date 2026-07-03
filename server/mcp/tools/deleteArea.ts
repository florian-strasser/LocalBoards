import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";

const db = setupDatabase();

export default defineMcpTool({
  name: "deleteArea",
  description: "Delete an area and all its associated data",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    areaId: z.number().describe("The id of the area to delete"),
    boardId: z.number().describe("The id of the board the area belongs to"),
  },
  handler: async ({ areaId, boardId }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!areaId || !boardId) {
      return textResult("areaId and boardId are required.");
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


      // Require write access: owner or an `edit` invitation. Public boards are
      // read-only (shared, tested helper — keeps this in sync with the REST API).
      const decision = await authorizeBoard(db, board, userId, "edit");
      if (!decision.ok) {
        return textResult("Unauthorized access.");
      }

      // Check if the area exists
      const [areaRows] = await db.execute("SELECT * FROM areas WHERE id = ?", [
        areaId,
      ]);
      const area = areaRows[0];

      if (!area) {
        return textResult("Area not found.");
      }

      // Check if the area belongs to the board
      if (area.board != boardId) {
        return textResult("You don't have permission to delete this area.");
      }

      // Delete comments related to cards in the area
      await db.execute(
        "DELETE FROM comments WHERE card IN (SELECT id FROM cards WHERE area = ?)",
        [areaId],
      );

      // Delete notifications related to cards in the area
      await db.execute(
        "DELETE FROM notifications WHERE cardId IN (SELECT id FROM cards WHERE area = ?)",
        [areaId],
      );

      // Delete cards from area
      await db.execute("DELETE FROM cards WHERE area = ?", [areaId]);

      // Delete the area
      const [result] = await db.execute("DELETE FROM areas WHERE id = ?", [
        areaId,
      ]);

      if (result.affectedRows === 0) {
        return textResult("Area not found or already deleted.");
      }

      // Emit socket event for area deletion
      const serverSocket = getServerSocket();
      if (serverSocket) {
        serverSocket.to(`board-${boardId}`).emit("deleteArea", {
          area: areaId,
          boardId,
        });
      }

      return jsonResult({ message: "Area deleted successfully" });
    } catch (error) {
      logger.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
