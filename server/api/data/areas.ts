import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch areas
      const query = getQuery(event);
      const boardId = query.boardId;

      if (!boardId) {
        event.res.statusCode = 400;
        return { error: "Board ID is required for GET requests" };
      }

      const [rows] = await db.execute(
        "SELECT * FROM areas WHERE board = ? ORDER BY sort ASC",
        [boardId],
      );

      return { areas: rows };
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
