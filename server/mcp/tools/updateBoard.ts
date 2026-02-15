import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "updateBoard",
  description: "Update an existing board",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    id: z.number().describe("The id of the board to update"),
    name: z.string().describe("The name of the board"),
    style: z
      .string()
      .describe("The style of the board, can be defined as 'kanban' or 'todo'"),
    image: z.string().optional().describe("The image URL for the board"),
    status: z.string().describe("The status of the board (public or private)"),
  },
  handler: async ({ id, name, style, image, status }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!name || !style || !status) {
      return textResult("name, style, and status are required.");
    }

    if (!userId) {
      return textResult(
        "Authentication required. Please provide a valid API key.",
      );
    }

    try {
      // Update existing board
      const [brows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        id,
      ]);
      const board = brows[0];

      if (!board) {
        return textResult("Board not found.");
      }

      // Check if the user has permission to update the board
      let writeAccess = false;

      if (board.user !== userId) {
        // Check if the user has an invitation with edit permission
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ? AND permission = 'edit'",
          [id, userId],
        );

        if (invitationRows.length > 0) {
          writeAccess = invitationRows[0].permission === "edit";
        }
      } else {
        // User is the creator of the board, so they have write access
        writeAccess = true;
      }

      if (!writeAccess) {
        return textResult("Unauthorized access.");
      }

      const imageVal = image ? image : null;

      // Update existing board
      const [result] = await db.execute(
        "UPDATE boards SET name = ?, style = ?, image = ?, status = ? WHERE id = ? AND user = ?",
        [name, style, imageVal, status, id, userId],
      );

      if (result.affectedRows === 0) {
        return textResult(
          "Board not found or you do not have permission to edit it.",
        );
      }

      // Fetch the updated board
      const [rows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        id,
      ]);
      const returnBoard = rows[0];

      return jsonResult({ board: returnBoard });
    } catch (error) {
      console.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
