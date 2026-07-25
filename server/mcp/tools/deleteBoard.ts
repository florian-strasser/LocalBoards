import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";
import {
  requireUserId,
  requireWriteAccess,
  requireBoard,
  requireId,
  boardIdInput,
  McpError,
} from "../../utils/mcpHelpers";

const db = setupDatabase();

export default defineMcpTool({
  name: "deleteBoard",
  title: "Delete a board",
  description:
    "Permanently delete a board and everything in it (areas, cards, comments, attachments, invitations, notifications). This cannot be undone and only the board owner can do it.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: { ...boardIdInput },
  inputExamples: [{ boardId: 1 }],
  handler: async ({ boardId, boardID }) => {
    const userId = requireUserId();
    requireWriteAccess();
    const bid = requireId(boardId, boardID, "boardId");
    const board = await requireBoard(bid, userId, "edit");
    if (board.user !== userId) {
      throw new McpError(
        "FORBIDDEN",
        "Only the board owner can delete a board.",
      );
    }

    const cardSubquery =
      "SELECT id FROM cards WHERE area IN (SELECT id FROM areas WHERE board = ?)";
    await db.execute(`DELETE FROM comments WHERE card IN (${cardSubquery})`, [
      bid,
    ]);
    await db.execute(
      `DELETE FROM attachments WHERE card IN (${cardSubquery})`,
      [bid],
    );
    await db.execute("DELETE FROM invitations WHERE board = ?", [bid]);
    await db.execute("DELETE FROM `webhooks` WHERE board = ?", [bid]);
    await db.execute("DELETE FROM `board_placements` WHERE board = ?", [bid]);
    await db.execute("DELETE FROM notifications WHERE boardId = ?", [bid]);
    await db.execute(
      "DELETE FROM cards WHERE area IN (SELECT id FROM areas WHERE board = ?)",
      [bid],
    );
    await db.execute("DELETE FROM areas WHERE board = ?", [bid]);
    await db.execute("DELETE FROM boards WHERE id = ?", [bid]);

    const serverSocket = getServerSocket();
    if (serverSocket) {
      serverSocket.to(`board-${bid}`).emit("deletedBoard", { boardID: bid });
    }

    return jsonResult({ deleted: true, boardId: bid });
  },
});
