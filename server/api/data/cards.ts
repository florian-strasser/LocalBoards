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

  // CRITICAL FIX: Use authenticated userId consistently
  const userId = userIdFromApiKey || session?.user.id;

  // CRITICAL FIX: Ensure userId is defined (defense in depth)
  if (!userId) {
    event.res.statusCode = 403;
    return { error: "Unauthorized access" };
  }

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch cards for a specific area
      const query = getQuery(event);
      const areaId = query.areaId;

      // HIGH FIX: Validate areaId is a positive integer
      if (!areaId || isNaN(Number(areaId)) || Number(areaId) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid area ID" };
      }

      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [areaId],
      );
      const board = boardRows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
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
        const [cards] = await db.execute(
          "SELECT c.id, c.area, c.name, c.content, c.status, c.sort, (SELECT COUNT(*) FROM comments co WHERE co.card = c.id) as commentCount, (SELECT COUNT(*) FROM attachments a WHERE a.card = c.id) as attachmentCount FROM cards c WHERE c.area = ? ORDER BY c.sort ASC",
          [areaId],
        );

        // Prefetch comments and attachment metadata for every card so the
        // card modal can render instantly without an extra round trip. The
        // attachment file payload (filedata) is intentionally excluded here to
        // keep the board response lean — it is fetched on download via
        // /api/data/attachment.
        if (cards.length > 0) {
          const cardIds = cards.map((card) => card.id);
          const placeholders = cardIds.map(() => "?").join(",");

          const [commentRows] = await db.execute(
            `SELECT comments.id AS id, comments.card AS card, comments.user AS user, user.name AS userName, user.image AS userImage, comments.content AS content, comments.date AS date FROM comments LEFT JOIN user ON comments.user = user.id WHERE comments.card IN (${placeholders}) ORDER BY comments.date DESC`,
            cardIds,
          );

          const [attachmentRows] = await db.execute(
            `SELECT id, card, filename, filetype, filesize FROM attachments WHERE card IN (${placeholders})`,
            cardIds,
          );

          const commentsByCard = new Map();
          for (const row of commentRows) {
            const comment = {
              id: row.id,
              card: row.card,
              user: row.user,
              userImage: row.userImage,
              userName: row.userName || "Unknown User",
              content: row.content,
              date: row.date,
            };
            if (!commentsByCard.has(row.card)) commentsByCard.set(row.card, []);
            commentsByCard.get(row.card).push(comment);
          }

          const attachmentsByCard = new Map();
          for (const row of attachmentRows) {
            if (!attachmentsByCard.has(row.card))
              attachmentsByCard.set(row.card, []);
            attachmentsByCard.get(row.card).push({
              id: row.id,
              filename: row.filename,
              filetype: row.filetype,
              filesize: row.filesize,
            });
          }

          for (const card of cards) {
            card.status = !!card.status;
            card.comments = commentsByCard.get(card.id) || [];
            card.attachments = attachmentsByCard.get(card.id) || [];
          }
        }

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
