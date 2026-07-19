import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";
import {
  requireUserId,
  requireWriteAccess,
  requireArea,
  requireId,
  areaIdInput,
  serializeArea,
} from "../../utils/mcpHelpers";

const db = setupDatabase();

export default defineMcpTool({
  name: "updateArea",
  title: "Rename an area",
  description:
    "Rename an area (column). To reorder areas use moveAreas. Needs edit access to the board.",
  annotations: {
    readOnlyHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    ...areaIdInput,
    id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Deprecated alias for areaId."),
    name: z.string().min(1).describe("The new area name."),
  },
  inputExamples: [{ areaId: 1, name: "Doing" }],
  handler: async ({ areaId, areaID, id, name }) => {
    const userId = requireUserId();
    requireWriteAccess();
    const aid = requireId(areaId, areaID ?? id, "areaId");
    const { board } = await requireArea(aid, userId, "edit");

    await db.execute("UPDATE areas SET name = ? WHERE id = ?", [name, aid]);
    const [rows]: any = await db.execute("SELECT * FROM areas WHERE id = ?", [
      aid,
    ]);
    const area = rows[0];

    const serverSocket = getServerSocket();
    if (serverSocket) {
      serverSocket.to(`board-${board.id}`).emit("updateArea", {
        area,
        boardId: board.id,
      });
    }

    return jsonResult({ area: serializeArea(area) });
  },
});
