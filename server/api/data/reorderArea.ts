import { defineEventHandler, readBody } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "POST") {
      // Handle POST request to reorder areas
      const { boardId, areas } = await readBody(event);

      if (!boardId || !areas || !Array.isArray(areas)) {
        event.res.statusCode = 400;
        return { error: "Board ID and areas array are required" };
      }

      // Start a transaction
      await db.execute("START TRANSACTION");

      try {
        // Update the order of each area
        for (let index = 0; index < areas.length; index++) {
          const area = areas[index];
          await db.execute(
            "UPDATE areas SET sort = ? WHERE id = ? AND board = ?",
            [index, area.id, boardId],
          );
        }

        // Commit transaction
        await db.execute("COMMIT");

        return { message: "Areas resorted successfully" };
      } catch (error) {
        // Rollback transaction on error
        await db.execute("ROLLBACK");
        throw error;
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
