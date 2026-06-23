import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";

const db = setupDatabase();

export default defineMcpTool({
  name: "orderCard",
  description: "Update the order of cards in an area",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    areaId: z.number().describe("The id of the area"),
    cardOrders: z
      .array(
        z.object({
          cardId: z.number().describe("The id of the card"),
          sort: z.number().describe("The new sort order of the card"),
        }),
      )
      .describe("Array of card IDs and their new sort orders"),
  },
  handler: async ({ areaId, cardOrders }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!areaId || !cardOrders || cardOrders.length === 0) {
      return textResult("areaId and cardOrders are required.");
    }

    if (!userId) {
      return textResult(
        "Authentication required. Please provide a valid API key.",
      );
    }

    try {
      // Get the board information
      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [areaId],
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

      // Verify that all cards belong to the specified area
      const cardIds = cardOrders.map((order) => order.cardId);
      const placeholders = cardIds.map(() => "?").join(",");
      const query = `SELECT id FROM cards WHERE id IN (${placeholders}) AND area = ?`;
      const params = [...cardIds, areaId];

      const [cardRows] = await db.execute(query, params);

      logger.debug("orderCard: fetched cards", cardRows);
      logger.debug(`orderCard: ${cardRows.length} cards : ${cardOrders.length} orders`);
      if (cardRows.length !== cardOrders.length) {
        return textResult(
          "One or more cards do not belong to the specified area.",
        );
      }

      // Update the sort order for each card
      for (const order of cardOrders) {
        await db.execute("UPDATE cards SET sort = ? WHERE id = ?", [
          order.sort,
          order.cardId,
        ]);
      }

      // Fetch the updated cards to return them
      const [updatedCards] = await db.execute(
        "SELECT id, area, name, content, status, sort FROM cards WHERE area = ? ORDER BY sort ASC",
        [areaId],
      );

      // Emit socket event for card reordering
      const serverSocket = getServerSocket();
      if (serverSocket) {
        for (const order of cardOrders) {
          serverSocket.to(`board-${areaId}`).emit("orderdCard", {
            cardId: order.cardId,
            areaId: areaId,
            newIndex: order.sort,
            boardId: board.id,
          });
        }
      }

      return jsonResult({ cards: updatedCards });
    } catch (error) {
      logger.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
