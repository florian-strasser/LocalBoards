import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";
import {
  requireUserId,
  requireWriteAccess,
  requireBoard,
  requireId,
  boardIdInput,
  serializeBoard,
  McpError,
} from "../../utils/mcpHelpers";

const db = setupDatabase();

export default defineMcpTool({
  name: "updateBoard",
  title: "Update a board",
  description:
    "Change a board's settings (name, style, status, cover image). Partial update — pass only what changes. Board settings can only be changed by the board's owner.",
  annotations: {
    readOnlyHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    ...boardIdInput,
    id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Deprecated alias for boardId."),
    name: z.string().min(1).optional().describe("New board name."),
    style: z.enum(["kanban", "todo"]).optional().describe("New layout."),
    status: z
      .enum(["private", "public"])
      .optional()
      .describe("New visibility."),
    image: z.string().optional().describe("New cover image URL ('' to clear)."),
  },
  inputExamples: [{ boardId: 1, status: "public" }],
  handler: async ({ boardId, boardID, id, name, style, status, image }) => {
    const userId = requireUserId();
    requireWriteAccess();
    const bid = requireId(boardId, boardID ?? id, "boardId");
    const board = await requireBoard(bid, userId, "edit");
    if (board.user !== userId) {
      throw new McpError(
        "FORBIDDEN",
        "Only the board owner can change board settings.",
      );
    }

    const fields: string[] = [];
    const values: any[] = [];
    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if (style !== undefined) {
      fields.push("style = ?");
      values.push(style);
    }
    if (status !== undefined) {
      fields.push("status = ?");
      values.push(status);
    }
    if (image !== undefined) {
      fields.push("image = ?");
      values.push(image === "" ? null : image);
    }
    if (fields.length === 0) {
      throw new McpError("VALIDATION", "Provide at least one field to update.");
    }

    await db.execute(`UPDATE boards SET ${fields.join(", ")} WHERE id = ?`, [
      ...values,
      bid,
    ]);
    const [rows]: any = await db.execute("SELECT * FROM boards WHERE id = ?", [
      bid,
    ]);
    const updated = rows[0];

    const serverSocket = getServerSocket();
    if (serverSocket) {
      serverSocket.to(`board-${bid}`).emit("updateBoard", {
        boardID: bid,
        boardName: updated.name,
        boardStatus: updated.status,
        boardStyle: updated.style,
      });
    }

    return jsonResult({ board: serializeBoard(updated) });
  },
});
