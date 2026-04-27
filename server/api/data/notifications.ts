import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
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

  // CRITICAL FIX: Use authenticated userId consistently
  const userId = userIdFromApiKey || session?.user.id;

  // CRITICAL FIX: Ensure userId is defined (defense in depth)
  if (!userId) {
    event.res.statusCode = 403;
    return { error: "Unauthorized access" };
  }

  const query = getQuery(event);

  try {
    const db = setupDatabase();

    if (method === "GET") {
      // Fetch notifications for the authenticated user
      const [rows] = await db.execute(
        "SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC",
        [userId],
      );
      return { notifications: rows };
    } else if (method === "PATCH") {
      // Mark a notification as read
      const notificationId = query.id;

      // HIGH FIX: Validate notificationId is a positive integer
      if (
        !notificationId ||
        isNaN(Number(notificationId)) ||
        Number(notificationId) <= 0
      ) {
        event.res.statusCode = 400;
        return { error: "Invalid notification ID" };
      }

      await db.execute(
        "UPDATE notifications SET isRead = TRUE WHERE id = ? AND userId = ?",
        [notificationId, userId],
      );
      return { message: "Notification marked as read" };
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
