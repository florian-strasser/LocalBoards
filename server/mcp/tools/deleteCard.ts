import { z } from "zod";
import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";

const db = setupDatabase();

export default defineMcpTool({
  name: "deleteCard",
  description: "Delete a card and all its associated data",
  annotations: {
    readOnlyHint: false,
  },
  inputSchema: {
    cardID: z.number().describe("The id of the card to delete"),
  },
  handler: async ({ cardID }) => {
    const event = useEvent();
    const userId = event.context.userId as string;

    if (!cardID) {
      return textResult("cardID is required.");
    }

    if (!userId) {
      return textResult(
        "Authentication required. Please provide a valid API key.",
      );
    }

    try {
      // Fetch card details
      const [cardRows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardID,
      ]);
      const card = cardRows[0];

      if (!card) {
        return textResult("Card not found.");
      }

      // Get the board information
      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

      if (!board) {
        return textResult("Board not found.");
      }


      // Require write access: owner or an `edit` invitation. Public boards are
      // read-only (shared, tested helper — keeps this in sync with the REST API).
      const decision = await authorizeBoard(db, board, userId, "edit");
      if (!decision.ok) {
        return textResult("Unauthorized access.");
      }

      // Delete comments related to the card
      await db.execute("DELETE FROM comments WHERE card = ?", [cardID]);

      // Delete notifications related to the card
      await db.execute("DELETE FROM notifications WHERE cardId = ?", [cardID]);

      // Delete the card
      const [result] = await db.execute("DELETE FROM cards WHERE id = ?", [
        cardID,
      ]);

      if (result.affectedRows === 0) {
        return textResult("Card not found or already deleted.");
      }

      // Emit socket event for card deletion
      const serverSocket = getServerSocket();
      if (serverSocket) {
        serverSocket.to(`board-${board.id}`).emit("deletedCard", {
          boardId: board.id,
          card: card,
        });
      }

      return jsonResult({ message: "Card deleted successfully", card });
    } catch (error) {
      logger.error("Database error:", error);
      return textResult("Internal server error.");
    }
  },
});
