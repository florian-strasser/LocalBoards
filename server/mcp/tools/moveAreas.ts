import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";

const db = setupDatabase();

export default defineMcpTool({
  name: "moveAreas",
  description: "Update the order of areas in a board",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    boardId: z.number().describe("The id of the board"),
    areas: z
      .array(
        z.object({
          id: z.number().describe("The id of the area"),
        }),
      )
      .describe("Array of area objects with their IDs"),
  },
  handler: async ({ boardId, areas }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!boardId || !areas || !Array.isArray(areas)) {
      return textResult("boardId and areas array are required.");
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

      try {
        // Update the order of areas in the database
        for (let i = 0; i < areas.length; i++) {
          const area = areas[i];
          const [result] = await db.execute(
            "UPDATE areas SET sort = ? WHERE id = ? AND board = ?",
            [i, area.id, boardId],
          );

          if (result.affectedRows === 0) {
            return textResult(
              `Area with ID ${area.id} not found or you do not have permission to edit it.`,
            );
          }
        }

        // Fetch updated areas to emit
        const [updatedAreas] = await db.execute(
          "SELECT * FROM areas WHERE board = ? ORDER BY sort",
          [boardId],
        );

        // Emit socket event for area order update
        const serverSocket = getServerSocket();
        if (serverSocket) {
          serverSocket.to(`board-${boardId}`).emit("updateAreas", {
            areas: updatedAreas,
            boardId,
          });
        }

        return jsonResult({ message: "Area order updated successfully" });
      } catch (error) {
        console.error("Error updating area order:", error);
        return textResult("Internal server error.");
      }
    } catch (error) {
      console.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
