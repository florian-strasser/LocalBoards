import { defineEventHandler, readBody, getQuery } from "h3";
import { auth } from "~/lib/auth";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Check the HTTP method
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
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch card details
      const { cardID } = getQuery(event);

      if (!cardID) {
        event.res.statusCode = 400;
        return { error: "Card ID is required" };
      }

      // Fetch card details
      const cardId = Array.isArray(cardID) ? cardID[0] : cardID;
      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardId,
      ]);
      const card = rows[0];

      if (!card) {
        event.res.statusCode = 404;
        return { error: "Card not found" };
      }

      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      let readAccess = false;
      if (board.status === "private" && board.user !== userId) {
        if (!userIdFromApiKey && !session) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length > 0) {
          readAccess = true;
        }
      } else if (board.user === userId) {
        if (!userIdFromApiKey && !session) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        readAccess = true;
      } else if (board.status === "public") {
        readAccess = true;
      }

      if (readAccess) {
        // Convert status from number to boolean
        card.status = !!card.status;

        return { card };
      } else {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }
    } else if (method === "POST") {
      // Handle POST request to create a new card
      const { areaId, name, content, status, user } = await readBody(event);

      if (!areaId || !name || !user) {
        event.res.statusCode = 400;
        return { error: "Area ID, name, and user are required" };
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
        if (!userIdFromApiKey && !session) {
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
        const [crows] = await db.execute("SELECT * FROM cards WHERE area = ?", [
          areaId,
        ]);

        const cardCount = crows ? crows.length + 1 : 0;

        // Create new card
        const [result] = await db.execute(
          "INSERT INTO cards (area, name, content, status, sort) VALUES (?, ?, ?, ?, ?)",
          [areaId, name, content || "", status ? 1 : 0, cardCount],
        );

        const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
          result.insertId,
        ]);
        const card = rows[0];

        // Fetch all users who have access to the board (owner and invited users)
        const [boardRows] = await db.execute(
          "SELECT user, id AS boardId FROM boards WHERE id = (SELECT board FROM areas WHERE id = ?)",
          [areaId],
        );
        const boardOwner = boardRows[0]?.user;
        const boardId = boardRows[0]?.boardId;

        const [invitedUsers] = await db.execute(
          "SELECT user FROM invitations WHERE board = (SELECT board FROM areas WHERE id = ?)",
          [areaId],
        );

        // Create notifications for the board owner and invited users
        const usersToNotify = [
          boardOwner,
          ...invitedUsers.map((inv) => inv.user),
        ].filter(Boolean);

        for (const userId of usersToNotify) {
          if (userId !== user) {
            // Don't notify the user who created the card
            await db.execute(
              "INSERT INTO notifications (userId, type, boardId, cardId, message) VALUES (?, ?, ?, ?, ?)",
              [
                userId,
                "card_created",
                boardId,
                card.id,
                `New card created: ${card.name}`,
              ],
            );
          }
        }

        return { card };
      } else {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }
    } else if (method === "PUT") {
      // Handle PUT request to update an existing card
      const { cardID, name, content, status } = await readBody(event);

      if (!cardID || !name) {
        event.res.statusCode = 400;
        return { error: "Card ID and name are required" };
      }

      // Fetch card details
      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardID,
      ]);
      const card = rows[0];

      if (!card) {
        event.res.statusCode = 404;
        return { error: "Card not found" };
      }

      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

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
        // Fetch the original card to check if status changed
        const [originalCardRows] = await db.execute(
          "SELECT * FROM cards WHERE id = ?",
          [cardID],
        );
        const originalCard = originalCardRows[0];
        const originalStatus = !!originalCard.status;
        const newStatus = !!status;

        // Update the card
        await db.execute(
          "UPDATE cards SET name = ?, content = ?, status = ? WHERE id = ?",
          [name, content || "", status ? 1 : 0, cardID],
        );

        // Fetch the updated card
        const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
          cardID,
        ]);
        const card = rows[0];

        if (!card) {
          event.res.statusCode = 404;
          return { error: "Card not found" };
        }

        // Convert status from number to boolean
        card.status = !!card.status;

        // Create notification if status changed
        if (originalStatus !== newStatus) {
          // Fetch all users who have access to the board (owner and invited users)
          const [boardRows] = await db.execute(
            "SELECT user, id AS boardId FROM boards WHERE id = (SELECT board FROM areas WHERE id = ?)",
            [card.area],
          );
          const boardOwner = boardRows[0]?.user;
          const boardId = boardRows[0]?.boardId;

          const [invitedUsers] = await db.execute(
            "SELECT user FROM invitations WHERE board = (SELECT board FROM areas WHERE id = ?)",
            [card.area],
          );

          // Create notifications for the board owner and invited users
          const usersToNotify = [
            boardOwner,
            ...invitedUsers.map((inv) => inv.user),
          ].filter(Boolean);

          const statusText = newStatus ? "completed" : "reopened";
          const notificationMessage = `Card "${card.name}" status changed to ${statusText}`;

          for (const notifyUserId of usersToNotify) {
            if (notifyUserId !== userId) {
              // Don't notify the user who changed the status
              await db.execute(
                "INSERT INTO notifications (userId, type, boardId, cardId, message) VALUES (?, ?, ?, ?, ?)",
                [
                  notifyUserId,
                  "card_status_changed",
                  boardId,
                  card.id,
                  notificationMessage,
                ],
              );
            }
          }
        }

        return { card };
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
