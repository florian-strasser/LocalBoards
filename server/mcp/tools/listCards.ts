import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "listCards",
  description: "List all cards for a specific area",
  annotations: {
    readOnlyHint: true,
  },
  inputSchema: {
    areaID: z.number().describe("The id of the area"),
  },
  handler: async ({ areaID }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!areaID) {
      return textResult("areaID required.");
    }

    if (!userId) {
      return textResult(
        "Authentication required. Please provide a valid API key.",
      );
    }

    try {
      // Check if the area exists and get the board information
      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [areaID],
      );
      const board = boardRows[0];

      if (!board) {
        return textResult("Area not found or associated board not found.");
      }

      // Check if the user has access to the board
      let readAccess = false;
      if (board.status === "private" && board.user !== userId) {
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length > 0) {
          readAccess = true;
        }
      } else if (board.user === userId) {
        readAccess = true;
      } else if (board.status === "public") {
        readAccess = true;
      }

      if (!readAccess) {
        return textResult("Unauthorized access.");
      }

      // Fetch cards for the area
      const [cards] = await db.execute(
        "SELECT id, area, name, content, status, sort FROM cards WHERE area = ? ORDER BY sort ASC",
        [areaID],
      );

      return jsonResult({ cards });
    } catch (error) {
      logger.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
