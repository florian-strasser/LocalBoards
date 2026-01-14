import { defineEventHandler, readBody, getQuery } from "h3";
import { auth } from "~/lib/auth";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  const session = await auth.api.getSession({
    headers: event.headers,
  });

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch board data
      const query = getQuery(event);
      const id = query.id;

      if (!id) {
        event.res.statusCode = 400;
        return { error: "Board ID is required for GET requests" };
      }

      const [rows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        id,
      ]);
      const board = rows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      // Check if the user has access to this board
      const userId = query.userId;

      let writeAccess = false;
      if (board.status === "private" && (!userId || board.user !== userId)) {
        if (!session || session.user.id !== userId) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
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
        if (!session || session.user.id !== userId) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        // User is the creator of the board, so they have write access
        writeAccess = true;
      } else if (board.status === "public" && session) {
        writeAccess = true;
      }

      return { board, writeAccess };
    } else if (method === "POST") {
      // Get the board data from the request body
      const { id, userId, name, style, status } = await readBody(event);

      if (!userId || !name || !style || !status) {
        event.res.statusCode = 400;
        return { error: "User ID, name, style, and status are required" };
      }

      let board;
      if (id) {
        const [brows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
          id,
        ]);
        board = brows[0];

        if (!board) {
          event.res.statusCode = 404;
          return { error: "Board not found" };
        }

        let writeAccess = false;

        if (board.user !== userId) {
          if (!session || session.user.id !== userId) {
            event.res.statusCode = 403;
            return { error: "Unauthorized access" };
          }
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
          writeAccess = "edit";
        }
        if (writeAccess) {
          // Update existing board
          const [result] = await db.execute(
            "UPDATE boards SET name = ?, style = ?, status = ? WHERE id = ? AND user = ?",
            [name, style, status, id, userId],
          );

          if (result.affectedRows === 0) {
            event.res.statusCode = 404;
            return {
              error: "Board not found or you do not have permission to edit it",
            };
          }

          const [rows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
            id,
          ]);
          board = rows[0];
        } else {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
      } else {
        if (!session || session.user.id !== userId) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        // Create new board
        const [result] = await db.execute(
          "INSERT INTO boards (user, name, style, status) VALUES (?, ?, ?, ?)",
          [userId, name, style, status],
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
      const userId = query.userId;

      if (!id || !userId) {
        event.res.statusCode = 400;
        return {
          error: "Board ID and user ID are required for DELETE requests",
        };
      }

      if (!session || session.user.id !== userId) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      const [rows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        id,
      ]);
      const board = rows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      // Check if the user has permission to delete the board
      if (board.user !== userId) {
        event.res.statusCode = 403;
        return { error: "You don't have permission to delete this board" };
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
        return { error: "Board not found or already deleted" };
      }

      return { message: "Board deleted successfully" };
    } else if (method === "PATCH") {
      // Handle PATCH request to update area order
      const { boardId, areas } = await readBody(event);

      if (!session) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      if (!boardId || !areas || !Array.isArray(areas)) {
        event.res.statusCode = 400;
        return {
          error: "Board ID and areas array are required for PATCH requests",
        };
      }

      const [rows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = rows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      // Check if the user has access to this board
      const userId = session.user.id;

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
              error: `Area with ID ${area.id} not found or you do not have permission to edit it`,
            };
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
