import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import {
  requireUserId,
  requireArea,
  requireId,
  areaIdInput,
  serializeArea,
} from "../../utils/mcpHelpers";

export default defineMcpTool({
  name: "getArea",
  title: "Get an area",
  description:
    "Get a single area (column) by id: id, boardId, name and position. Requires read access to the area's board.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: { ...areaIdInput },
  inputExamples: [{ areaId: 1 }],
  handler: async ({ areaId, areaID }) => {
    const userId = requireUserId();
    const id = requireId(areaId, areaID, "areaId");
    const { area } = await requireArea(id, userId, "read");
    return jsonResult({ area: serializeArea(area) });
  },
});
