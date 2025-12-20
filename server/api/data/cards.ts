import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch cards for a specific area
      const query = getQuery(event);
      const areaId = query.areaId;

      if (!areaId) {
        event.res.statusCode = 400;
        return { error: "Area ID is required for GET requests" };
      }

      const [cards] = await db.execute(
        "SELECT id, area, name, content, status FROM cards WHERE area = ? ORDER BY sort ASC",
        [areaId],
      );

      return { cards };
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
