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

    const renumberSortValues = async (areaId: number) => {
      // Get all cards in the area ordered by their current sort value
      const [cards] = (await db.execute(
        "SELECT id FROM cards WHERE area = ? ORDER BY sort ASC",
        [areaId],
      )) as any[];
      // Update each card with sequential sort values
      for (let i = 0; i < (cards as any[]).length; i++) {
        await db.execute("UPDATE cards SET sort = ? WHERE id = ?", [
          i,
          (cards as any[])[i].id,
        ]);
      }
    };

    if (method === "POST") {
      const { cardId, fromAreaId, toAreaId, newIndex } = await readBody(event);

      // HIGH FIX: Validate all required fields with generic message
      if (!cardId || !fromAreaId || !toAreaId || newIndex === undefined) {
        event.res.statusCode = 400;
        return {
          error: "Required fields are missing",
        };
      }

      // HIGH FIX: Validate all IDs are positive integers
      if (
        isNaN(Number(cardId)) ||
        Number(cardId) <= 0 ||
        isNaN(Number(fromAreaId)) ||
        Number(fromAreaId) <= 0 ||
        isNaN(Number(toAreaId)) ||
        Number(toAreaId) <= 0
      ) {
        event.res.statusCode = 400;
        return { error: "Invalid ID values" };
      }

      // CRITICAL FIX: Check access to BOTH source and destination boards
      const [fromBoardRows] = (await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [fromAreaId],
      )) as any[];
      const fromBoard = (fromBoardRows as any[])[0];

      if (!fromBoard) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      const [toBoardRows] = (await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [toAreaId],
      )) as any[];
      const toBoard = (toBoardRows as any[])[0];

      if (!toBoard) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Require write access to the source board, and (if different) the
      // destination board too.
      const fromDecision = await authorizeBoard(db, fromBoard, userId, "edit");
      if (!fromDecision.ok) {
        event.res.statusCode = fromDecision.status;
        return { error: fromDecision.error };
      }

      if (toBoard.id !== fromBoard.id) {
        const toDecision = await authorizeBoard(db, toBoard, userId, "edit");
        if (!toDecision.ok) {
          event.res.statusCode = toDecision.status;
          return { error: toDecision.error };
        }
      }

      {
        try {
          // Update sort order of other cards in the destination area
          await db.execute(
            "UPDATE cards SET sort = sort + 1 WHERE sort >= ? AND area = ?",
            [newIndex, toAreaId],
          );

          // Update the targets card's area and sort order
          await db.execute("UPDATE cards SET area = ?, sort = ? WHERE id = ?", [
            toAreaId,
            newIndex,
            cardId,
          ]);

          await renumberSortValues(toAreaId);
          await renumberSortValues(fromAreaId);

          // Fetch card name and area names for notification
          const [cardRows] = (await db.execute(
            "SELECT name FROM cards WHERE id = ?",
            [cardId],
          )) as any[];
          const cardName = (cardRows as any[])[0]?.name;

          // Fetch source and destination area names
          const [fromAreaRows] = (await db.execute(
            "SELECT name FROM areas WHERE id = ?",
            [fromAreaId],
          )) as any[];
          const fromAreaName = (fromAreaRows as any[])[0]?.name;

          const [toAreaRows] = (await db.execute(
            "SELECT name FROM areas WHERE id = ?",
            [toAreaId],
          )) as any[];
          const toAreaName = (toAreaRows as any[])[0]?.name;

          await recordCardActivity(cardId, "moved", userId, {
            from: fromAreaName,
            to: toAreaName,
          });

          // Fetch all users who have access to the board (owner and invited users)
          const [boardRows] = (await db.execute(
            "SELECT user, id AS boardId FROM boards WHERE id = (SELECT board FROM areas WHERE id = ?)",
            [toAreaId],
          )) as any[];
          const boardOwner = (boardRows as any[])[0]?.user;
          const boardId = (boardRows as any[])[0]?.boardId;

          const [invitedUsers] = (await db.execute(
            "SELECT user FROM invitations WHERE board = (SELECT board FROM areas WHERE id = ?)",
            [toAreaId],
          )) as any[];

          // Create notifications for the board owner and invited users
          const usersToNotify = [
            boardOwner,
            ...(invitedUsers as any[]).map((inv: any) => inv.user),
          ].filter(Boolean);

          for (const notifyUserId of usersToNotify) {
            if (notifyUserId !== userId) {
              // Don't notify the user who moved the card
              await db.execute(
                "INSERT INTO notifications (userId, type, boardId, cardId, message, actorId) VALUES (?, ?, ?, ?, ?, ?)",
                [
                  notifyUserId,
                  "card_moved",
                  boardId,
                  cardId,
                  `Card "${cardName}" moved from "${fromAreaName}" to "${toAreaName}"`,
                                userId,
              ],
              );
            }
          }

          // Emit socket event for card move (API calls only)
          if (auth.viaApiKey) {
            const serverSocket = getServerSocket();
            if (serverSocket) {
              serverSocket.to(`board-${boardId}`).emit("movedCard", {
                cardId,
                fromAreaId,
                toAreaId,
                newIndex,
                boardId,
              });
            }
          }

          return { success: true };
        } catch (error) {
          throw error;
        }
      }
    } else {
      event.res.statusCode = 405;
      return { error: "Method not allowed" };
    }
  } catch (error) {
    logger.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
