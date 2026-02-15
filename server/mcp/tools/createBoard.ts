import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "createBoard",
  description: "Create a new board or update an existing board",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    id: z
      .number()
      .optional()
      .describe("The id of the board to update (if updating)"),
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
    const imageVal = image ? image : null;

    try {
      // Create new board
      const [result] = await db.execute(
        "INSERT INTO boards (user, name, style, image, status) VALUES (?, ?, ?, ?, ?)",
        [userId, name, style, imageVal, status],
      );

      // Fetch the created board
      const [rows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        result.insertId,
      ]);
      const board = rows[0];

      return jsonResult({ board });
    } catch (error) {
      console.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
