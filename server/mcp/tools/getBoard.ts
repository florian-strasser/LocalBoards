import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server"; // optional
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "getBoard",
  description: "Get a specific board",
  annotations: {
    readOnlyHint: true,
  },
  inputSchema: {
    boardID: z.number().describe("The id of the board"),
  },
  handler: async ({ boardID }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!boardID) {
      return textResult("boardID required.");
    }

    if (!userId) {
      return textResult(
        "Authentication required. Please provide a valid API key.",
      );
    }
    const [rows] = await db.execute(
      `SELECT boards.*, 'own' as boardType
       FROM boards
       WHERE boards.user = ? AND boards.id = ?
       UNION
       SELECT boards.*, 'shared' as boardType
       FROM boards
       LEFT JOIN invitations ON boards.id = invitations.board
       WHERE invitations.user = ? AND boards.user != ? AND boards.id = ?`,
      [userId, boardID, userId, userId, boardID],
    );
    if (rows) return jsonResult({ board: rows[0] });
    else return textResult("Could not find a board with the id.");
  },
});
