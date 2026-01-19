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

  if (!userIdFromApiKey && !session) {
    event.res.statusCode = 403;
    return { error: "Unauthorized access" };
  }

  const userId = userIdFromApiKey || session?.user.id;

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "POST") {
      // Handle POST request to create or update an area
      const { id, boardId, name } = await readBody(event);

      if (!boardId || !name) {
        event.res.statusCode = 400;
        return { error: "Board ID and name are required" };
      }

      const [brows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = brows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      let writeAccess = false;
      if (board.status === "private" && (!userId || board.user !== userId)) {
        // Check if the user has an invitation
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [boardId, userId],
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
      if (writeAccess) {
        let area;
        if (id) {
          // Update existing area
          const [result] = await db.execute(
            "UPDATE areas SET name = ? WHERE id = ? AND board = ?",
            [name, id, boardId],
          );

          if (result.affectedRows === 0) {
            event.res.statusCode = 404;
            return {
              error: "Area not found or you do not have permission to edit it",
            };
          }

          const [rows] = await db.execute("SELECT * FROM areas WHERE id = ?", [
            id,
          ]);
          area = rows[0];
        } else {
          const [arows] = await db.execute(
            "SELECT * FROM areas WHERE board = ?",
            [boardId],
          );
          const areaCount = arows ? arows.length + 1 : 0;
          // Create new area
          const [result] = await db.execute(
            "INSERT INTO areas (board, name, sort) VALUES (?, ?, ?)",
            [boardId, name, areaCount],
          );

          const [rows] = await db.execute("SELECT * FROM areas WHERE id = ?", [
            result.insertId,
          ]);
          area = rows[0];
        }

        return { area };
      } else {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }
    } else if (method === "DELETE") {
      // Handle DELETE request to delete an area
      const query = getQuery(event);
      const id = query.id;
      const boardId = query.boardId;
      if (!id || !boardId) {
        event.res.statusCode = 400;
        return {
          error: "Area ID and board ID are required for DELETE requests",
        };
      }

      const [brows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = brows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      let writeAccess = false;
      if (board.status === "private" && (!userId || board.user !== userId)) {
        // Check if the user has an invitation
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [boardId, userId],
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
      } else if (board.status === "public" && (userIdFromApiKey || session)) {
        writeAccess = true;
      }

      if (writeAccess) {
        const [rows] = await db.execute("SELECT * FROM areas WHERE id = ?", [
          id,
        ]);
        const area = rows[0];

        if (!area) {
          event.res.statusCode = 404;
          return { error: "Area not found" };
        }

        // Check if the area belongs to the board
        if (area.board != boardId) {
          event.res.statusCode = 403;
          return { error: "You don't have permission to delete this area" };
        }
        // Delete comments related to cards in the area
        await db.execute(
          "DELETE FROM comments WHERE card IN (SELECT id FROM cards WHERE area = ?)",
          [id],
        );

        // Delete notifications related to cards in the area
        await db.execute(
          "DELETE FROM notifications WHERE cardId IN (SELECT id FROM cards WHERE area = ?)",
          [id],
        );

        // Delete cards from area
        const [results] = await db.execute("DELETE FROM cards WHERE area = ?", [
          id,
        ]);

        // Delete the area
        const [result] = await db.execute("DELETE FROM areas WHERE id = ?", [
          id,
        ]);

        if (result.affectedRows === 0) {
          event.res.statusCode = 404;
          return { error: "Area not found or already deleted" };
        }

        return { message: "Area deleted successfully" };
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
