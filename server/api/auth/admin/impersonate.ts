import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getUserSession, createSession } from "../../../utils/auth";

// Start impersonating another user. An admin swaps their own session cookie for
// a fresh session that authenticates as the target user, tagged with the
// admin's id (`impersonatedBy`) so the app can show a banner and let them
// switch back via /api/auth/admin/stop-impersonate.
export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    const session = await getUserSession(event);
    if (!session) {
      event.res.statusCode = 401;
      return { error: "UNAUTHORIZED" };
    }

    if (session.user.role !== "admin") {
      event.res.statusCode = 403;
      return { error: "FORBIDDEN" };
    }

    // Refuse to nest impersonation — an already-impersonating session must stop
    // first, otherwise there's no reliable admin identity to return to.
    if (session.session?.impersonatedBy) {
      event.res.statusCode = 400;
      return { error: "ALREADY_IMPERSONATING" };
    }

    const body = await readBody(event);
    const { userId } = body || {};

    if (!isStoredId(userId)) {
      event.res.statusCode = 400;
      return { error: "INVALID_USER_ID" };
    }

    // Impersonating yourself is a no-op that would only complicate the "stop"
    // flow, so reject it.
    if (userId === session.user.id) {
      event.res.statusCode = 400;
      return { error: "CANNOT_IMPERSONATE_SELF" };
    }

    const db = await setupDatabase();

    const [users]: any = await db.execute(
      "SELECT id, banned FROM `user` WHERE `id` = ?",
      [userId],
    );
    if (users.length === 0) {
      event.res.statusCode = 404;
      return { error: "USER_NOT_FOUND" };
    }
    // Banned users have no access; impersonating one would be a dead end.
    if (users[0].banned) {
      event.res.statusCode = 400;
      return { error: "USER_BANNED" };
    }

    // Issue a new session for the target user, recording who is behind it. This
    // sets the session cookie, replacing the admin's own session cookie.
    const result = await createSession(event, userId, session.user.id);
    if ("error" in result) {
      event.res.statusCode = 500;
      return { error: result.error };
    }

    return { success: true };
  } catch (error) {
    logger.error("Impersonate error:", error);
    event.res.statusCode = 500;
    return { error: "INTERNAL_SERVER_ERROR" };
  }
});
