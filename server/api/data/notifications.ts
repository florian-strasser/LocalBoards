import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  const method = event.req.method;

  // Resolve the authenticated user (API key or session). Notifications are
  // user-scoped, so every query is filtered by this userId.
  const auth = await resolveUserId(event);
  if (!auth.ok) {
    event.res.statusCode = auth.status;
    return { error: auth.error };
  }
  const userId = auth.userId;

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
    logger.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
