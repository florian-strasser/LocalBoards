import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";
import {
  requireUserId,
  requireWriteAccess,
  requireArea,
  requireId,
  areaIdInput,
} from "../../utils/mcpHelpers";

const db = setupDatabase();

export default defineMcpTool({
  name: "deleteArea",
  title: "Delete an area",
  description:
    "Permanently delete an area (column) and every card in it, along with those cards' comments, attachments and notifications. This cannot be undone. Needs edit access to the board.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: { ...areaIdInput },
  inputExamples: [{ areaId: 1 }],
  handler: async ({ areaId, areaID }) => {
    const userId = requireUserId();
    requireWriteAccess();
    const aid = requireId(areaId, areaID, "areaId");
    const { board } = await requireArea(aid, userId, "edit");

    await db.execute(
      "DELETE FROM comments WHERE card IN (SELECT id FROM cards WHERE area = ?)",
      [aid],
    );
    await db.execute(
      "DELETE FROM attachments WHERE card IN (SELECT id FROM cards WHERE area = ?)",
      [aid],
    );
    await db.execute(
      "DELETE FROM notifications WHERE cardId IN (SELECT id FROM cards WHERE area = ?)",
      [aid],
    );
    await db.execute("DELETE FROM cards WHERE area = ?", [aid]);
    await db.execute("DELETE FROM areas WHERE id = ?", [aid]);

    const serverSocket = getServerSocket();
    if (serverSocket) {
      serverSocket.to(`board-${board.id}`).emit("deleteArea", {
        area: aid,
        boardId: board.id,
      });
    }

    return jsonResult({ deleted: true, areaId: aid });
  },
});
