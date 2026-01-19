import { defineEventHandler, getQuery } from "h3";
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

      const [brows] = await db.execute("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = brows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      const userId = session?.user.id || userIdFromApiKey;

      let readAccess = false;
      if (board.status === "private" && board.user !== userId) {
        if (!session && !userIdFromApiKey) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length > 0) {
          readAccess = true;
        }
      } else if (board.user === userId) {
        if (!session && !userIdFromApiKey) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
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
