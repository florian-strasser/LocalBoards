import { defineEventHandler, readBody } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";

export default defineEventHandler(async (event) => {
  const method = event.req.method;

  // Resolve the authenticated user (API key or session).
  const auth = await resolveUserId(event);
  if (!auth.ok) {
    event.res.statusCode = auth.status;
    return { error: auth.error };
  }
  const userId = auth.userId;

  try {
    const db = setupDatabase();

    const renumberSortValues = async (areaId) => {
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
    if (method === "POST") {
      const { cardId, areaId, newIndex } = await readBody(event);

      // HIGH FIX: Validate all required fields with generic message
      if (!cardId || !areaId || newIndex === undefined) {
        event.res.statusCode = 400;
        return { error: "Required fields are missing" };
      }

      // HIGH FIX: Validate all IDs are positive integers
      if (
        isNaN(Number(cardId)) ||
        Number(cardId) <= 0 ||
        isNaN(Number(areaId)) ||
        Number(areaId) <= 0
      ) {
        event.res.statusCode = 400;
        return { error: "Invalid ID values" };
      }

      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [areaId],
      );
      const board = boardRows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      const writeDecision = await authorizeBoard(db, board, userId, "edit");
      if (!writeDecision.ok) {
        event.res.statusCode = writeDecision.status;
        return { error: writeDecision.error };
      }

      {
        try {
          // Update sort order of other cards in the destination area
          await db.execute(
            "UPDATE cards SET sort = sort + 1 WHERE sort >= ? AND area = ?",
            [newIndex, areaId],
          );

          // Update the card's sort order
          await db.execute("UPDATE cards SET sort = ? WHERE id = ?", [
            newIndex,
            cardId,
          ]);

          await renumberSortValues(areaId);

          // Emit socket event for card reordering (API calls only)
          if (auth.viaApiKey) {
            const serverSocket = getServerSocket();
            if (serverSocket) {
              serverSocket.to(`board-${board.id}`).emit("orderdCard", {
                cardId,
                areaId,
                newIndex,
                boardId: board.id,
              });
            }
          }

          return { success: true };
        } catch (error) {
          // HIGH FIX: Don't leak internal error details
          console.error("Database error:", error);
          event.res.statusCode = 500;
          return { error: "Internal server error" };
        }
      }
    } else {
      event.res.statusCode = 405;
      return { error: "Method not allowed" };
    }
  } catch (error) {
    console.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
