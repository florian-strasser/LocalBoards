import { defineEventHandler, readBody } from "h3";
import { auth } from "~/lib/auth";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  const method = event.req.method;

  const session = await auth.api.getSession({
    headers: event.headers,
  });

  const userId = session?.user.id;

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

      if (!cardId || !areaId || newIndex === undefined) {
        event.res.statusCode = 400;
        return { error: "Card ID, areaId, and newIndex are required" };
      }

      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [areaId],
      );
      const board = boardRows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      let writeAccess = false;
      if (board.status === "private" && (!userId || board.user !== userId)) {
        if (!session) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        // Check if the user has an invitation
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length === 0) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        // Determine write access based on invitation permission
        writeAccess = invitationRows[0].permission === "edit";
      } else if (board.user === userId) {
        if (!session || session.user.id !== userId) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        // User is the creator of the board, so they have write access
        writeAccess = true;
      } else if (board.status === "public" && session) {
        writeAccess = true;
      }

      if (writeAccess) {
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

          return { success: true };
        } catch (error) {
          return { error: error };
        }
      } else {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }
    } else {
      event.res.statusCode = 405;
      return { error: "Method not allowed" };
    }
  } catch (error) {
    console.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal Server error" };
  }
});
