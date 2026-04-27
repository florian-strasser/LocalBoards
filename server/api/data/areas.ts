import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  // Extract API key from headers
  const apiKey = event.headers.get("x-api-key");

  // Validate API key if provided
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

  // CRITICAL FIX: Early auth check - block unauthenticated access
  if (!userIdFromApiKey && !session) {
    event.res.statusCode = 403;
    return { error: "Unauthorized access" };
  }

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch areas
      const query = getQuery(event);
      const boardId = query.boardId;

      // HIGH FIX: Validate boardId is a positive integer
      if (!boardId || isNaN(Number(boardId)) || Number(boardId) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid board ID" };
      }

      const [brows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = brows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      const userId = session?.user.id || userIdFromApiKey;

      // CRITICAL FIX: Ensure userId is defined (defense in depth)
      if (!userId) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      let readAccess = false;
      if (board.status === "private" && board.user !== userId) {
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length > 0) {
          readAccess = true;
        }
      } else if (board.user === userId) {
        readAccess = true;
      } else if (board.status === "public") {
        readAccess = true;
      }
      if (readAccess) {
        const [rows] = await db.execute(
          "SELECT * FROM areas WHERE board = ? ORDER BY sort ASC",
          [boardId],
        );

        return { areas: rows };
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
