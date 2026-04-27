import { defineEventHandler, readBody, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  const apiKey = event.headers.get("x-api-key");

  // CRITICAL FIX: Check auth before reading body
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

  // CRITICAL FIX: Early auth check
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
    console.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
