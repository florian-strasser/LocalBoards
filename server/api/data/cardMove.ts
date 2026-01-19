import { defineEventHandler, readBody } from "h3";
import { auth } from "~/lib/auth";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  const method = event.req.method;

  // Extract API key from headers
  const apiKey = event.headers.get("x-api-key");

  // Validate API key if provided
  let userIdFromApiKey = null;
  if (apiKey) {
    const data = await auth.api.verifyApiKey({
      body: {
        key: apiKey,
      },
    });

    if (data.error) {
      event.res.statusCode = 403;
      return { error: "Unauthorized access" };
    } else {
      userIdFromApiKey = data.key.userId;
    }
  }

  const session = await auth.api.getSession({
    headers: event.headers,
  });

  const userId = userIdFromApiKey || session?.user.id;

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

      if (!cardId || !fromAreaId || !toAreaId || newIndex === undefined) {
        event.res.statusCode = 400;
        return {
          error: "Card ID, fromAreaId, toAreaId, and newIndex are required",
        };
      }

      const [boardRows] = (await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [fromAreaId],
      )) as any[];
      const board = (boardRows as any[])[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      let writeAccess = false;
      if (board.status === "private" && (!userId || board.user !== userId)) {
        if (!userIdFromApiKey && !session) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        // Check if the user has an invitation
        const [invitationRows] = (await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        )) as any[];

        if ((invitationRows as any[]).length === 0) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        // Determine write access based on invitation permission
        writeAccess = (invitationRows as any[])[0].permission === "edit";
      } else if (board.user === userId) {
        if (!userIdFromApiKey && !session) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        // User is the creator of the board, so they have write access
        writeAccess = true;
      } else if (board.status === "public" && (userIdFromApiKey || session)) {
        writeAccess = true;
      }

      if (writeAccess) {
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

          return { success: true };
        } catch (error) {
          throw error;
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
    return { error: "Internal server error" };
  }
});
