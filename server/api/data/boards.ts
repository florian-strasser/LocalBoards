import { defineEventHandler, readBody, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Get the user ID from the request body
  const { userId, shared } = await readBody(event);
  const sharedBoards = shared === "true";

  if (!userId) {
    event.res.statusCode = 400;
    return { error: "User ID is required" };
  }

  try {
    // Initialize database
    const db = setupDatabase();

    // Get all boards for the user
    let rows;
    if (shared) {
      // Fetch boards shared with the user
      const [sharedRows] = await db.execute(
        `SELECT boards.*
         FROM boards
         LEFT JOIN invitations ON boards.id = invitations.board
         WHERE invitations.user = ?`,
        [userId],
      );
      rows = sharedRows;
    } else {
      // Fetch the user's own boards
      const [ownRows] = await db.execute(
        "SELECT * FROM boards WHERE user = ?",
        [userId],
      );
      rows = ownRows;
    }

    return {
      boards: rows,
    };
  } catch (error) {
    console.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
