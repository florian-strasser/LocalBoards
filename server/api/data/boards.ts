import { defineEventHandler, readBody } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Get the user ID from the request body
  const { userId } = await readBody(event);

  if (!userId) {
    event.res.statusCode = 400;
    return { error: "User ID is required" };
  }

  try {
    // Initialize database
    const db = setupDatabase();

    // Get all boards for the user
    const [rows] = await db.execute("SELECT * FROM boards WHERE user = ?", [
      userId,
    ]);

    return {
      boards: rows,
    };
  } catch (error) {
    console.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
