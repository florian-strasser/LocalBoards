import { defineEventHandler, readBody, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Resolve the authenticated user (API key or session). Boards are
  // user-scoped (own or shared-with), so queries are filtered by this userId.
  const auth = await resolveUserId(event);
  if (!auth.ok) {
    event.res.statusCode = auth.status;
    return { error: auth.error };
  }
  const userId = auth.userId;

  // Read body for shared parameter
  const { shared } = await readBody(event);

  // HIGH FIX: Validate shared is boolean if present
  const isShared = shared === true || shared === "true";

  try {
    // Initialize database
    const db = setupDatabase();

    // Get all boards for the authenticated user
    let rows;
    if (isShared) {
      // Fetch boards shared with the authenticated user
      const [sharedRows] = await db.execute(
        `SELECT boards.*
         FROM boards
         LEFT JOIN invitations ON boards.id = invitations.board
         WHERE invitations.user = ?`,
        [userId],
      );
      rows = sharedRows;
    } else {
      // Fetch the authenticated user's own boards
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
    logger.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
