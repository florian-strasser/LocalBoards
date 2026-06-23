import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";

const db = setupDatabase();

export default defineMcpTool({
  name: "createArea",
  description: "Create a new area",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    boardId: z.number().describe("The id of the board"),
    name: z.string().describe("The name of the area"),
  },
  handler: async ({ id, boardId, name }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!boardId || !name) {
      return textResult("boardId and name are required.");
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

      // Check if the user has write access to the board
      let writeAccess = false;
      if (board.status === "private" && board.user !== userId) {
        // Check if the user has an invitation
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [boardId, userId],
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

      // Get the current number of areas in the board to determine the sort order
      const [arows] = await db.execute("SELECT * FROM areas WHERE board = ?", [
        boardId,
      ]);
      const areaCount = arows ? arows.length + 1 : 0;

      // Create new area
      const [result] = await db.execute(
        "INSERT INTO areas (board, name, sort) VALUES (?, ?, ?)",
        [boardId, name, areaCount],
      );

      // Fetch the created area
      const [rows] = await db.execute("SELECT * FROM areas WHERE id = ?", [
        result.insertId,
      ]);
      const area = rows[0];

      // Emit socket event for area creation
      const serverSocket = getServerSocket();
      if (serverSocket) {
        serverSocket.to(`board-${boardId}`).emit("addArea", {
          area,
          boardId,
        });
      }

      return jsonResult({ area });
    } catch (error) {
      logger.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
