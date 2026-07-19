import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import {
  requireUserId,
  requireCard,
  requireId,
  cardIdInput,
} from "../../utils/mcpHelpers";

const db = setupDatabase();

export default defineMcpTool({
  name: "listComments",
  title: "List comments",
  description:
    "List a card's comments, oldest first. Each has id, authorId (the local user id, or null for imported comments), authorName, Markdown content and date (ISO 8601). Requires read access to the board.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: { ...cardIdInput },
  inputExamples: [{ cardId: 1 }],
  handler: async ({ cardId, cardID }) => {
    const userId = requireUserId();
    const id = requireId(cardId, cardID, "cardId");
    await requireCard(id, userId, "read");
    const [rows]: any = await db.execute(
      "SELECT comments.id AS id, comments.user AS authorId, COALESCE(user.name, comments.authorName) AS authorName, comments.content AS content, comments.date AS date FROM comments LEFT JOIN user ON comments.user = user.id WHERE comments.card = ? ORDER BY comments.date ASC",
      [id],
    );
    return jsonResult({
      comments: rows.map((r: any) => ({
        id: r.id,
        authorId: r.authorId ?? null,
        authorName: r.authorName || "Unknown",
        content: r.content ?? "",
        date: r.date ? new Date(r.date).toISOString() : null,
      })),
    });
  },
});
