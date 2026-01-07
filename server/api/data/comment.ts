import { defineEventHandler, readBody, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch comments for a card
      const { cardID } = getQuery(event);

      if (!cardID) {
        event.res.statusCode = 400;
        return { error: "Card ID is required" };
      }
      // return [{ card: cardID }];

      // Fetch comments for the card with user information using a LEFT JOIN
      // return { card: cardID };
      const [rows] = await db.execute(
        "SELECT comments.id AS id, comments.card AS card, comments.user AS user, user.name AS userName, user.image AS image, comments.content AS content, comments.date AS date FROM comments LEFT JOIN user ON comments.user = user.id WHERE comments.card = ? ORDER BY comments.date DESC",
        [cardID],
      );
      const comments = rows.map((row) => ({
        id: row.id,
        card: row.card,
        user: row.user,
        userImage: row.image,
        userName: row.userName || "Unknown User",
        content: row.content,
        date: row.date,
      }));

      return { comments: comments };
    } else if (method === "POST") {
      // Handle POST request to create a new comment
      const { card, content, user } = await readBody(event);

      if (!card || !content || !user) {
        event.res.statusCode = 400;
        return { error: "Card ID, content, and user are required" };
      }

      // Create new comment
      const [result] = await db.execute(
        "INSERT INTO comments (card, user, content) VALUES (?, ?, ?)",
        [card, user, content],
      );

      // Fetch the created comment with user information using a LEFT JOIN
      const [rows] = await db.execute(
        "SELECT comments.*, user.name AS userName, user.image AS userImage FROM comments LEFT JOIN user ON comments.user = user.id WHERE comments.id = ?",
        [result.insertId],
      );
      const comment = rows[0]
        ? {
            id: rows[0].id,
            card: rows[0].card,
            user: rows[0].user,
            userImage: rows[0].userImage,
            userName: rows[0].userName || "Unknown User",
            content: rows[0].content,
            date: rows[0].date,
          }
        : null;

      // Fetch all users who have access to the board (owner and invited users)
      const [boardRows] = await db.execute(
        "SELECT user, id AS boardId FROM boards WHERE id = (SELECT board FROM areas WHERE id = (SELECT area FROM cards WHERE id = ?))",
        [card],
      );
      const boardOwner = boardRows[0]?.user;
      const boardId = boardRows[0]?.boardId;

      const [invitedUsers] = await db.execute(
        "SELECT user FROM invitations WHERE board = (SELECT board FROM areas WHERE id = (SELECT area FROM cards WHERE id = ?))",
        [card],
      );

      // Create notifications for the board owner and invited users
      const usersToNotify = [
        boardOwner,
        ...invitedUsers.map((inv) => inv.user),
      ].filter(Boolean);

      for (const userId of usersToNotify) {
        if (userId !== user) {
          // Don't notify the user who created the comment
          await db.execute(
            "INSERT INTO notifications (userId, type, boardId, cardId, message) VALUES (?, ?, ?, ?, ?)",
            [
              userId,
              "comment",
              boardId,
              card,
              `New comment on card: ${rows[0]?.name || "a card"}`,
            ],
          );
        }
      }

      return { comment };
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
