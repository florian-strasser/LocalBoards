import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server"; // optional
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "listBoards",
  description: "List all boards available to the user",
  annotations: {
    readOnlyHint: true,
  },
  handler: async () => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!userId) {
      return textResult(
        "Authentication required. Please provide a valid API key.",
      );
    }
    const [rows] = await db.execute(
      `SELECT boards.*, 'own' as boardType
       FROM boards
       WHERE boards.user = ?
       UNION
       SELECT boards.*, 'shared' as boardType
       FROM boards
       LEFT JOIN invitations ON boards.id = invitations.board
       WHERE invitations.user = ? AND boards.user != ?`,
      [userId, userId, userId],
    );
    return jsonResult({ boards: rows });
  },
});
