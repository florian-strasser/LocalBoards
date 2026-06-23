import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "getArea",
  description: "Get a specific area by its ID",
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
      const [areaRows] = await db.execute(
        "SELECT a.id as `areaID`, a.name as `areaName`, a.sort as `areaSort`, a.board as `board`, b.* FROM areas a JOIN boards b ON a.board = b.id WHERE a.id = ?",
        [areaID],
      );
      const areaWithBoard = areaRows[0];

      if (!areaWithBoard) {
        return textResult("Area not found.");
      }

      const area = {
        id: areaWithBoard.areaID,
        board: areaWithBoard.board,
        name: areaWithBoard.areaName,
        sort: areaWithBoard.areaSort,
      };

      const board = {
        id: areaWithBoard.id,
        user: areaWithBoard.user,
        name: areaWithBoard.name,
        status: areaWithBoard.status,
      };

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

      return jsonResult({ area });
    } catch (error) {
      logger.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
