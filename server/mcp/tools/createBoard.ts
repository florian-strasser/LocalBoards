import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import {
  requireUserId,
  requireWriteAccess,
  serializeBoard,
} from "../../utils/mcpHelpers";

const db = setupDatabase();

export default defineMcpTool({
  name: "createBoard",
  title: "Create a board",
  description:
    "Create a new board owned by the current user. `style` defaults to 'kanban' (columns) — 'todo' is a single list. `status` defaults to 'private'; 'public' makes it read-only to anyone with the link. Use createArea to add columns, then createCard. To change an existing board use updateBoard.",
  annotations: { readOnlyHint: false, openWorldHint: false },
  inputSchema: {
    name: z.string().min(1).describe("The board name."),
    style: z
      .enum(["kanban", "todo"])
      .optional()
      .describe("Layout: 'kanban' (default) or 'todo'."),
    status: z
      .enum(["private", "public"])
      .optional()
      .describe("'private' (default) or 'public'."),
    image: z.string().optional().describe("Optional cover image URL."),
  },
  inputExamples: [
    { name: "Product Roadmap" },
    { name: "Personal Tasks", style: "todo" },
  ],
  handler: async ({ name, style, status, image }) => {
    const userId = requireUserId();
    requireWriteAccess();
    const [result]: any = await db.execute(
      "INSERT INTO boards (user, name, style, image, status) VALUES (?, ?, ?, ?, ?)",
      [userId, name, style || "kanban", image || null, status || "private"],
    );
    const [rows]: any = await db.execute("SELECT * FROM boards WHERE id = ?", [
      result.insertId,
    ]);
    return jsonResult({ board: serializeBoard(rows[0]) });
  },
});
