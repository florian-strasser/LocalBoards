import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getUserSession } from "../../utils/auth";

// POST /api/auth/onboarding — mark the current user as onboarded, so the
// first-run guided tour is not offered again (called when the tour is started,
// completed or skipped).
export default defineEventHandler(async (event) => {
  if (event.req.method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  const session = await getUserSession(event);
  if (!session) {
    event.res.statusCode = 401;
    return { error: "UNAUTHORIZED" };
  }

  try {
    const db = await setupDatabase();
    await db.execute("UPDATE `user` SET `onboarded` = 1 WHERE `id` = ?", [
      session.user.id,
    ]);
    return { success: true };
  } catch (error) {
    logger.error("Mark onboarded error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
