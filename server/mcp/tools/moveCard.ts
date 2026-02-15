import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";

const db = setupDatabase();

export default defineMcpTool({
  name: "moveCard",
  description: "Move a card from one area to another",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    cardId: z.number().describe("The id of the card to move"),
    fromAreaId: z.number().describe("The id of the source area"),
    toAreaId: z.number().describe("The id of the destination area"),
    newIndex: z
      .number()
      .describe("The new index/sort order in the destination area"),
  },
  handler: async ({ cardId, fromAreaId, toAreaId, newIndex }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!cardId || !fromAreaId || !toAreaId || newIndex === undefined) {
      return textResult(
        "cardId, fromAreaId, toAreaId, and newIndex are required.",
      );
    }

    if (!userId) {
      return textResult(
        "Authentication required. Please provide a valid API key.",
      );
    }

    try {
      // Helper function to renumber sort values in an area
      const renumberSortValues = async (areaId: number) => {
        // Get all cards in the area ordered by their current sort value
        const [cards] = await db.execute(
          "SELECT id FROM cards WHERE area = ? ORDER BY sort ASC",
          [areaId],
        );
        // Update each card with sequential sort values
        for (let i = 0; i < cards.length; i++) {
          await db.execute("UPDATE cards SET sort = ? WHERE id = ?", [
            i,
            cards[i].id,
          ]);
        }
      };

      // Get the board information
      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [fromAreaId],
      );
      const board = boardRows[0];

      if (!board) {
        return textResult("Board not found.");
      }

      // Check if the user has write access to the board
      let writeAccess = false;
      if (board.status === "private" && board.user !== userId) {
        // Check if the user has an invitation
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length > 0) {
          writeAccess = invitationRows[0].permission === "edit";
        }
      } else if (board.user === userId) {
        // User is the creator of the board, so they have write access
        writeAccess = true;
      } else if (board.status === "public") {
        writeAccess = true;
      }

      if (!writeAccess) {
        return textResult("Unauthorized access.");
      }

      try {
        // Update sort order of other cards in the destination area
        await db.execute(
          "UPDATE cards SET sort = sort + 1 WHERE sort >= ? AND area = ?",
          [newIndex, toAreaId],
        );

        // Update the target card's area and sort order
        await db.execute("UPDATE cards SET area = ?, sort = ? WHERE id = ?", [
          toAreaId,
          newIndex,
          cardId,
        ]);

        // Renumber sort values in both areas
        await renumberSortValues(toAreaId);
        await renumberSortValues(fromAreaId);

        // Fetch card name and area names for notification
        const [cardRows] = await db.execute(
          "SELECT name FROM cards WHERE id = ?",
          [cardId],
        );
        const cardName = cardRows[0]?.name;

        // Fetch source and destination area names
        const [fromAreaRows] = await db.execute(
          "SELECT name FROM areas WHERE id = ?",
          [fromAreaId],
        );
        const fromAreaName = fromAreaRows[0]?.name;

        const [toAreaRows] = await db.execute(
          "SELECT name FROM areas WHERE id = ?",
          [toAreaId],
        );
        const toAreaName = toAreaRows[0]?.name;

        // Get board information for notifications
        const [boardInfoRows] = await db.execute(
          "SELECT user, id AS boardId FROM boards WHERE id = (SELECT board FROM areas WHERE id = ?)",
          [toAreaId],
        );
        const boardOwner = boardInfoRows[0]?.user;
        const boardId = boardInfoRows[0]?.boardId;

        // Fetch all users who have access to the board (owner and invited users)
        const [invitedUsers] = await db.execute(
          "SELECT user FROM invitations WHERE board = (SELECT board FROM areas WHERE id = ?)",
          [toAreaId],
        );

        // Create notifications for the board owner and invited users
        const usersToNotify = [
          boardOwner,
          ...invitedUsers.map((inv) => inv.user),
        ].filter(Boolean);

        for (const notifyUserId of usersToNotify) {
          if (notifyUserId !== userId) {
            // Don't notify the user who moved the card
            await db.execute(
              "INSERT INTO notifications (userId, type, boardId, cardId, message) VALUES (?, ?, ?, ?, ?)",
              [
                notifyUserId,
                "card_moved",
                boardId,
                cardId,
                `Card "${cardName}" moved from "${fromAreaName}" to "${toAreaName}"`,
              ],
            );
          }
        }

        return jsonResult({ success: true });
      } catch (error) {
        console.error("Error moving card:", error);
        return textResult("Failed to move card.");
      }
    } catch (error) {
      console.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
