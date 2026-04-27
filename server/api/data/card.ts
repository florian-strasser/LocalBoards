import { defineEventHandler, readBody, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";

// Function to handle file uploads
async function handleFileUpload(db, cardID, file) {
  const { filename, filetype, filesize, filedata } = file;

  // Insert the file into the attachments table
  const [result] = await db.execute(
    "INSERT INTO attachments (card, filename, filetype, filesize, filedata) VALUES (?, ?, ?, ?, ?)",
    [cardID, filename, filetype, filesize, filedata],
  );

  return result.insertId;
}

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  // Extract API key from headers
  const apiKey = event.headers.get("x-api-key");

  // Validate API key if provided
  let userIdFromApiKey = null;
  if (apiKey) {
    const data = await verifyApiKey(apiKey);

    if (data.error) {
      event.res.statusCode = 403;
      return { error: "Unauthorized access" };
    } else {
      userIdFromApiKey = data.key.userId;
    }
  }

  const session = await getSession(event);

  // CRITICAL FIX: Early auth check - block unauthenticated access
  if (!userIdFromApiKey && !session) {
    event.res.statusCode = 403;
    return { error: "Unauthorized access" };
  }

  // CRITICAL FIX: Use authenticated userId consistently
  const userId = userIdFromApiKey || session?.user.id;

  // CRITICAL FIX: Ensure userId is defined (defense in depth)
  if (!userId) {
    event.res.statusCode = 403;
    return { error: "Unauthorized access" };
  }

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch card details
      const { cardID } = getQuery(event);

      // HIGH FIX: Validate cardId is a positive integer
      const cardId = Array.isArray(cardID) ? cardID[0] : cardID;
      if (!cardId || isNaN(Number(cardId)) || Number(cardId) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid card ID" };
      }

      // Fetch card details
      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardId,
      ]);
      const card = rows[0];

      if (!card) {
        // HIGH FIX: Generic error to prevent card enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

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

      if (readAccess) {
        // Convert status from number to boolean
        card.status = !!card.status;

        // Fetch attachments for the card
        const [attachmentRows] = await db.execute(
          "SELECT id, filename, filetype, filesize, filedata FROM attachments WHERE card = ?",
          [cardId],
        );
        const attachments = attachmentRows.map((row) => ({
          id: row.id,
          filename: row.filename,
          filetype: row.filetype,
          filesize: row.filesize,
          filedata: row.filedata,
        }));

        return { card, attachments };
      } else {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }
    } else if (method === "POST") {
      // Handle POST request to create a new card
      const { areaId, name, content, status } = await readBody(event);

      // HIGH FIX: Validate required fields with generic message
      if (!areaId || !name) {
        event.res.statusCode = 400;
        return { error: "Required fields are missing" };
      }

      // HIGH FIX: Validate areaId is a positive integer
      if (isNaN(Number(areaId)) || Number(areaId) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid area ID" };
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

      let writeAccess = false;
      if (board.status === "private" && board.user !== userId) {
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
        // User is the creator of the board, so they have write access
        writeAccess = true;
      } else if (board.status === "public") {
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
        // CRITICAL FIX: Use authenticated userId instead of body user
        const usersToNotify = [
          boardOwner,
          ...invitedUsers.map((inv) => inv.user),
        ].filter(Boolean);

        for (const notifyUserId of usersToNotify) {
          if (notifyUserId !== userId) {
            // Don't notify the authenticated user who created the card
            await db.execute(
              "INSERT INTO notifications (userId, type, boardId, cardId, message) VALUES (?, ?, ?, ?, ?)",
              [
                notifyUserId,
                "card_created",
                boardId,
                card.id,
                `New card created: ${card.name}`,
              ],
            );
          }
        }

        // Emit socket event for card creation (only for API calls, not frontend)
        if (apiKey) {
          const serverSocket = getServerSocket();
          serverSocket.to(`board-${boardRows[0]?.boardId}`).emit("addCard", {
            boardId: boardRows[0]?.boardId,
            card: rows[0],
          });
        }

        return { card };
      } else {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }
    } else if (method === "PUT") {
      // Handle PUT request to update an existing card
      const { cardID, name, content, status, files } = await readBody(event);

      // HIGH FIX: Validate required fields with generic message
      if (!cardID || !name) {
        event.res.statusCode = 400;
        return { error: "Required fields are missing" };
      }

      // HIGH FIX: Validate cardID is a positive integer
      if (isNaN(Number(cardID)) || Number(cardID) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid card ID" };
      }

      // Fetch card details
      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardID,
      ]);
      const card = rows[0];

      if (!card) {
        // HIGH FIX: Generic error to prevent card enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      let writeAccess = false;
      if (board.status === "private" && board.user !== userId) {
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
        // User is the creator of the board, so they have write access
        writeAccess = true;
      } else if (board.status === "public") {
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

        // Handle file uploads if present
        let newAttachments = [];
        if (files && Array.isArray(files)) {
          for (const file of files) {
            const attachmentId = await handleFileUpload(db, cardID, file);
            newAttachments.push(attachmentId);
          }
        }

        // Fetch the updated card with comment and attachment counts
        const [rows] = await db.execute(
          "SELECT c.*, (SELECT COUNT(*) FROM comments co WHERE co.card = c.id) as commentCount, (SELECT COUNT(*) FROM attachments a WHERE a.card = c.id) as attachmentCount FROM cards c WHERE c.id = ?",
          [cardID],
        );
        const card = rows[0];

        if (!card) {
          // HIGH FIX: Generic error to prevent card enumeration
          event.res.statusCode = 404;
          return { error: "Resource not found" };
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

        // Fetch the new attachments if any were added
        let attachments = [];
        if (newAttachments.length > 0) {
          const [attachmentRows] = await db.execute(
            "SELECT id, filename, filetype, filesize, filedata FROM attachments WHERE id IN (?)",
            [newAttachments.join(",")],
          );
          attachments = attachmentRows.map((row) => ({
            id: row.id,
            filename: row.filename,
            filetype: row.filetype,
            filesize: row.filesize,
            filedata: row.filedata,
          }));
        }

        // Emit socket event for card update (only for API calls, not frontend)
        if (apiKey) {
          const serverSocket = getServerSocket();
          serverSocket.to(`board-${boardRows[0]?.boardId}`).emit("updateCard", {
            boardId: boardRows[0]?.boardId,
            attachments: attachments,
            card: rows[0],
          });
        }

        return { card, attachments };
      } else {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }
    } else if (method === "DELETE") {
      // Handle DELETE request to delete a card
      const { cardID } = await readBody(event);

      // HIGH FIX: Validate cardID is a positive integer
      if (!cardID || isNaN(Number(cardID)) || Number(cardID) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid card ID" };
      }

      // Fetch card details
      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardID,
      ]);
      const card = rows[0];

      if (!card) {
        // HIGH FIX: Generic error to prevent card enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      let writeAccess = false;
      if (board.status === "private" && board.user !== userId) {
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
        // User is the creator of the board, so they have write access
        writeAccess = true;
      } else if (board.status === "public") {
        writeAccess = true;
      }

      if (writeAccess) {
        // Delete notifications
        await db.execute("DELETE FROM comments WHERE card = ?", [cardID]);

        // Delete notifications related to cards in the area
        await db.execute("DELETE FROM notifications WHERE cardId = ?", [
          cardID,
        ]);

        // Delete Card
        const [result] = await db.execute("DELETE FROM cards WHERE id = ?", [
          cardID,
        ]);

        if (result.affectedRows === 0) {
          // HIGH FIX: Generic error to prevent card enumeration
          event.res.statusCode = 404;
          return { error: "Resource not found or already deleted" };
        }

        // Emit socket event for card deletion (only for API calls, not frontend)
        if (apiKey) {
          const serverSocket = getServerSocket();
          serverSocket.to(`board-${boardRows[0]?.id}`).emit("deletedCard", {
            boardId: boardRows[0]?.id,
            card: card,
          });
        }

        return { message: "Card deleted successfully", card: card };
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
