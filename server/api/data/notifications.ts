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
      // Join the actor's profile so the list can show who did it, with their
      // avatar. actorId is NULL for system notifications (due reminders) and
      // for rows created before that column existed — the UI falls back to the
      // name embedded in the message.
      const [rows]: any = await db.execute(
        `SELECT n.*, u.name AS actorName, u.image AS actorImage, u.type AS actorType
           FROM notifications n
           LEFT JOIN \`user\` u ON u.id = n.actorId
          WHERE n.userId = ?
          ORDER BY n.createdAt DESC`,
        [userId],
      );
      return { notifications: rows };
    } else if (method === "PATCH") {
      const isPositiveInt = (v: unknown) =>
        v !== undefined && !isNaN(Number(v)) && Number(v) > 0;

      // Mark read when the user opens a card: all of their notifications for
      // that card (comment, moved, status change, due, assigned, …).
      if (query.cardId !== undefined) {
        if (!isPositiveInt(query.cardId)) {
          event.res.statusCode = 400;
          return { error: "Invalid card ID" };
        }
        await db.execute(
          "UPDATE notifications SET isRead = TRUE WHERE userId = ? AND cardId = ?",
          [userId, query.cardId],
        );
        return { message: "Card notifications marked as read" };
      }

      // Mark read when the user opens a board: only the board-level (non-card)
      // notifications, e.g. invitations. Card notifications stay unread until
      // the card itself is opened.
      if (query.boardId !== undefined) {
        if (!isPositiveInt(query.boardId)) {
          event.res.statusCode = 400;
          return { error: "Invalid board ID" };
        }
        await db.execute(
          "UPDATE notifications SET isRead = TRUE WHERE userId = ? AND boardId = ? AND cardId IS NULL",
          [userId, query.boardId],
        );
        return { message: "Board notifications marked as read" };
      }

      // Legacy: mark a single notification read by id.
      if (!isPositiveInt(query.id)) {
        event.res.statusCode = 400;
        return { error: "Invalid notification ID" };
      }
      await db.execute(
        "UPDATE notifications SET isRead = TRUE WHERE id = ? AND userId = ?",
        [query.id, userId],
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
