import { defineEventHandler, readBody, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";

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
      // Handle GET request to fetch board data
      const query = getQuery(event);
      const id = query.id;

      // HIGH FIX: Validate boardId is a positive integer
      if (!id || isNaN(Number(id)) || Number(id) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid board ID" };
      }

      const [rows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        id,
      ]);
      const board = rows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Check if the user has access to this board

      let writeAccess = false;
      if (board.status === "private" && board.user !== userId) {
        // Check if the user has an invitation
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [id, userId],
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

      return { board, writeAccess };
    } else if (method === "POST") {
      // Get the board data from the request body
      const {
        id,
        userId: bodyUserId,
        name,
        style,
        image,
        status,
      } = await readBody(event);

      // HIGH FIX: Validate required fields with generic message
      if (!bodyUserId || !name || !style || !status) {
        event.res.statusCode = 400;
        return {
          error: "Required fields are missing",
        };
      }

      // CRITICAL FIX: Ensure body userId matches authenticated user
      if (bodyUserId !== userId) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // HIGH FIX: Validate id if present
      if (id && (isNaN(Number(id)) || Number(id) <= 0)) {
        event.res.statusCode = 400;
        return { error: "Invalid board ID" };
      }

      let board;
      if (id) {
        const [brows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
          id,
        ]);
        board = brows[0];

        if (!board) {
          event.res.statusCode = 404;
          return { error: "Resource not found" };
        }

        let writeAccess = false;

        if (board.user !== userId) {
          // Check if the user has an invitation with edit permission
          const [invitationRows] = await db.execute(
            "SELECT permission FROM invitations WHERE board = ? AND user = ? AND permission = 'edit'",
            [id, userId],
          );

          if (invitationRows.length === 0) {
            event.res.statusCode = 403;
            return { error: "Unauthorized access" };
          }
          writeAccess = invitationRows[0].permission === "edit";
        } else if (board.user === userId) {
          writeAccess = true;
        }
        if (writeAccess) {
          // Update existing board
          const [result] = await db.execute(
            "UPDATE boards SET name = ?, style = ?, image = ?, status = ? WHERE id = ? AND user = ?",
            [name, style, image, status, id, userId],
          );

          if (result.affectedRows === 0) {
            event.res.statusCode = 404;
            return {
              error: "Resource not found or access denied",
            };
          }

          const [rows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
            id,
          ]);
          board = rows[0];

          // Emit socket event for board update (API calls only)
          if (userIdFromApiKey) {
            const serverSocket = getServerSocket();
            if (serverSocket) {
              serverSocket.to(`board-${id}`).emit("updateBoard", {
                boardID: id,
                boardName: board.name,
                boardStatus: board.status,
                boardStyle: board.style,
              });
            }
          }
        } else {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
      } else {
        // Create new board
        const [result] = await db.execute(
          "INSERT INTO boards (user, name, style, image, status) VALUES (?, ?, ?, ?, ?)",
          [userId, name, style, image, status],
        );

        const [rows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
          result.insertId,
        ]);
        board = rows[0];
      }

      return {
        board,
      };
    } else if (method === "DELETE") {
      // Handle DELETE request to delete a board
      const query = getQuery(event);
      const id = query.id;

      // HIGH FIX: Validate boardId is a positive integer
      if (!id || isNaN(Number(id)) || Number(id) <= 0) {
        event.res.statusCode = 400;
        return {
          error: "Invalid board ID",
        };
      }

      const [rows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        id,
      ]);
      const board = rows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Check if the user has permission to delete the board
      if (board.user !== userId) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // Delete all invitations associated with the board
      await db.execute("DELETE FROM invitations WHERE board = ?", [id]);

      // Delete all notifications associated with the cards in the board's areas
      await db.execute(`DELETE FROM notifications WHERE boardId = ?`, [id]);

      // Delete all cards associated with the board's areas
      await db.execute(
        "DELETE FROM cards WHERE area IN (SELECT id FROM areas WHERE board = ?)",
        [id],
      );

      // Delete all areas associated with the board
      await db.execute("DELETE FROM areas WHERE board = ?", [id]);

      // Delete the board
      const [result] = await db.execute("DELETE FROM boards WHERE id = ?", [
        id,
      ]);

      if (result.affectedRows === 0) {
        event.res.statusCode = 404;
        return { error: "Resource not found or already deleted" };
      }

      // Emit socket event for board deletion (API calls only)
      if (userIdFromApiKey) {
        const serverSocket = getServerSocket();
        if (serverSocket) {
          serverSocket.to(`board-${id}`).emit("deletedBoard", {
            boardID: id,
          });
        }
      }

      return { message: "Board deleted successfully" };
    } else if (method === "PATCH") {
      // Handle PATCH request to update area order
      const { boardId, areas } = await readBody(event);

      // HIGH FIX: Validate boardId and areas
      if (
        !boardId ||
        isNaN(Number(boardId)) ||
        Number(boardId) <= 0 ||
        !areas ||
        !Array.isArray(areas)
      ) {
        event.res.statusCode = 400;
        return {
          error: "Invalid request parameters",
        };
      }

      const [rows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = rows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Check if the user has access to this board

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
        writeAccess = true;
      } else if (board.status === "public") {
        writeAccess = true;
      }

      if (!writeAccess) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      try {
        // Update the order of areas in the database
        for (let i = 0; i < areas.length; i++) {
          const area = areas[i];
          const [result] = await db.execute(
            "UPDATE areas SET sort = ? WHERE id = ? AND board = ?",
            [i, area.id, boardId],
          );

          if (result.affectedRows === 0) {
            event.res.statusCode = 404;
            return {
              error: "Resource not found or access denied",
            };
          }
        }

        // Fetch updated areas to emit
        const [updatedAreas] = await db.execute(
          "SELECT * FROM areas WHERE board = ? ORDER BY sort",
          [boardId],
        );

        // Emit socket event for area order update (API calls only)
        if (userIdFromApiKey) {
          const serverSocket = getServerSocket();
          if (serverSocket) {
            serverSocket.to(`board-${boardId}`).emit("updateAreas", {
              areas: updatedAreas,
              boardId,
            });
          }
        }

        return { message: "Area order updated successfully" };
      } catch (error) {
        console.error("Error updating area order:", error);
        event.res.statusCode = 500;
        return { error: "Internal server error" };
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
