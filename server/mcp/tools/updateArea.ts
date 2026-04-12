import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";

const db = setupDatabase();

export default defineMcpTool({
  name: "updateArea",
  description: "Update an existing area",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    id: z.number().describe("The id of the area to update (if updating)"),
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

      // Update existing area
      const [result] = await db.execute(
        "UPDATE areas SET name = ? WHERE id = ? AND board = ?",
        [name, id, boardId],
      );

      if (result.affectedRows === 0) {
        return textResult(
          "Area not found or you do not have permission to edit it.",
        );
      }

      // Fetch the updated area
      const [rows] = await db.execute("SELECT * FROM areas WHERE id = ?", [id]);
      const area = rows[0];

      // Emit socket event for area update
      const serverSocket = getServerSocket();
      if (serverSocket) {
        serverSocket.to(`board-${boardId}`).emit("updateArea", {
          area,
          boardId,
        });
      }

      return jsonResult({ area });
    } catch (error) {
      console.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
