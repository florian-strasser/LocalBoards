import { defineEventHandler, readBody, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

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

        // Create new area
        const [result] = await db.execute(
          "INSERT INTO areas (board, name, sort) VALUES (?, ?, ?)",
          [boardId, name, arows.length + 1],
        );

        const [rows] = await db.execute("SELECT * FROM areas WHERE id = ?", [
          result.insertId,
        ]);
        area = rows[0];
      }

      return { area };
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

      const [rows] = await db.execute("SELECT * FROM areas WHERE id = ?", [id]);
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
      const [result] = await db.execute("DELETE FROM areas WHERE id = ?", [id]);

      if (result.affectedRows === 0) {
        event.res.statusCode = 404;
        return { error: "Area not found or already deleted" };
      }

      return { message: "Area deleted successfully" };
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
