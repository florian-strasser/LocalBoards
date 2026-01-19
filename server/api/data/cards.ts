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

  const userId = userIdFromApiKey || session?.user.id;

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

      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [areaId],
      );
      const board = boardRows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      let readAccess = false;
      if (board.status === "private" && board.user !== userId) {
        if (!userIdFromApiKey && !session) {
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
        if (!userIdFromApiKey && !session) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        readAccess = true;
      } else if (board.status === "public") {
        readAccess = true;
      }

      if (readAccess) {
        const [cards] = await db.execute(
          "SELECT id, area, name, content, status, sort FROM cards WHERE area = ? ORDER BY sort ASC",
          [areaId],
        );

        return { cards };
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
