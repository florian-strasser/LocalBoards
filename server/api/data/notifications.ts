import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  const query = getQuery(event);
  const userId = query.userId;

  if (!userId) {
    event.res.statusCode = 400;
    return { error: "User ID is required" };
  }

  try {
    const db = setupDatabase();

    if (method === "GET") {
      // Fetch notifications for the user
      const [rows] = await db.execute(
        "SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC",
        [userId],
      );
      return { notifications: rows };
    } else if (method === "PATCH") {
      // Mark a notification as read
      const notificationId = query.id;
      if (!notificationId) {
        event.res.statusCode = 400;
        return { error: "Notification ID is required" };
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
