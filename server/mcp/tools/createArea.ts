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
  serializeArea,
} from "../../utils/mcpHelpers";

const db = setupDatabase();

export default defineMcpTool({
  name: "createArea",
  title: "Create an area",
  description:
    "Add an area (column/list) to the end of a board. Needs edit access to the board.",
  annotations: { readOnlyHint: false, openWorldHint: false },
  inputSchema: {
    ...boardIdInput,
    name: z.string().min(1).describe("The area name (e.g. 'Backlog', 'Done')."),
  },
  inputExamples: [{ boardId: 1, name: "In Progress" }],
  handler: async ({ boardId, boardID, name }) => {
    const userId = requireUserId();
    requireWriteAccess();
    const bid = requireId(boardId, boardID, "boardId");
    await requireBoard(bid, userId, "edit");

    const [countRows]: any = await db.execute(
      "SELECT COUNT(*) AS n FROM areas WHERE board = ?",
      [bid],
    );
    const sort = (countRows[0]?.n ?? 0) + 1;

    const [result]: any = await db.execute(
      "INSERT INTO areas (board, name, sort) VALUES (?, ?, ?)",
      [bid, name, sort],
    );
    const [rows]: any = await db.execute("SELECT * FROM areas WHERE id = ?", [
      result.insertId,
    ]);
    const area = rows[0];

    const serverSocket = getServerSocket();
    if (serverSocket) {
      serverSocket.to(`board-${bid}`).emit("addArea", { area, boardId: bid });
    }

    return jsonResult({ area: serializeArea(area) });
  },
});
