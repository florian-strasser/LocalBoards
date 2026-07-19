import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { checkWebhookTarget } from "../../utils/webhookTarget";

// Manage the caller's OWN webhook subscriptions. A subscription is per user and
// per board, so each collaborator wires up their own automation for a board they
// can access without touching anyone else's. A subscription can only ever send
// data the subscriber could already read.
export default defineEventHandler(async (event) => {
  const method = event.req.method;

  const auth = await resolveUserId(event);
  if (!auth.ok) {
    event.res.statusCode = auth.status;
    return { error: auth.error };
  }
  const userId = auth.userId;
  const db = setupDatabase();

  try {
    if (method === "GET") {
      const [rows]: any = await db.execute(
        `SELECT w.id, w.board, w.url, w.ignoreOwnActions, w.enabled, w.createdAt,
                (w.secret IS NOT NULL) AS hasSecret, b.name AS boardName
         FROM \`webhooks\` w JOIN \`boards\` b ON b.id = w.board
         WHERE w.user = ? ORDER BY w.id DESC`,
        [userId],
      );
      return {
        webhooks: rows.map((r: any) => ({
          id: r.id,
          boardId: r.board,
          boardName: r.boardName,
          url: r.url,
          ignoreOwnActions: !!r.ignoreOwnActions,
          enabled: !!r.enabled,
          hasSecret: !!r.hasSecret,
          createdAt: r.createdAt,
        })),
      };
    }

    if (method === "POST") {
      const body = await readBody(event).catch(() => null);
      if (!body || typeof body !== "object") {
        event.res.statusCode = 400;
        return { error: "INVALID_BODY" };
      }
      const { boardId, url, secret, ignoreOwnActions = true } = body as any;

      if (!boardId || isNaN(Number(boardId))) {
        event.res.statusCode = 400;
        return { error: "INVALID_BOARD" };
      }
      // http(s) only, and the host must not resolve into the instance's own
      // network — the server is the one making this request.
      const target = await checkWebhookTarget(url);
      if (!target.ok) {
        event.res.statusCode = 400;
        return { error: "INVALID_URL", message: target.reason };
      }
      if (secret && (typeof secret !== "string" || secret.length > 128)) {
        event.res.statusCode = 400;
        return { error: "INVALID_SECRET" };
      }

      // You may only subscribe to a board you can actually read.
      const [boardRows]: any = await db.execute(
        "SELECT * FROM `boards` WHERE id = ?",
        [boardId],
      );
      const board = boardRows[0];
      if (!board) {
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }
      const decision = await authorizeBoard(db, board, userId, "read");
      if (!decision.ok) {
        event.res.statusCode = decision.status;
        return { error: decision.error };
      }

      const [result]: any = await db.execute(
        "INSERT INTO `webhooks` (`user`, `board`, `url`, `secret`, `ignoreOwnActions`) VALUES (?, ?, ?, ?, ?)",
        [userId, boardId, url, secret || null, ignoreOwnActions ? 1 : 0],
      );
      return {
        success: true,
        webhook: {
          id: result.insertId,
          boardId: Number(boardId),
          boardName: board.name,
          url,
          ignoreOwnActions: !!ignoreOwnActions,
          enabled: true,
          hasSecret: !!secret,
        },
      };
    }

    if (method === "DELETE") {
      const id = getQuery(event).id;
      if (!id || isNaN(Number(id))) {
        event.res.statusCode = 400;
        return { error: "INVALID_ID" };
      }
      // Scoped to the caller — you can only delete your own subscription.
      const [result]: any = await db.execute(
        "DELETE FROM `webhooks` WHERE id = ? AND `user` = ?",
        [id, userId],
      );
      if (result.affectedRows === 0) {
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }
      return { success: true, id: Number(id) };
    }

    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  } catch (error) {
    logger.error("Webhooks endpoint error:", error);
    event.res.statusCode = 500;
    return { error: "INTERNAL_SERVER_ERROR" };
  }
});
