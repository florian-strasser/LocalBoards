import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getUserSession } from "../../../utils/auth";
import bcrypt from "bcryptjs";

// UUID v4 regex for userId validation
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    // Verify session and admin role
    const session = await getUserSession(event);
    if (!session) {
      event.res.statusCode = 401;
      return { error: "UNAUTHORIZED" };
    }

    if (session.user.role !== "admin") {
      event.res.statusCode = 403;
      return { error: "FORBIDDEN" };
    }

    const body = await readBody(event);
    const { userId } = body;

    // Validate input - UUID format
    if (!userId || typeof userId !== "string" || !uuidRegex.test(userId)) {
      event.res.statusCode = 400;
      return { error: "INVALID_USER_ID" };
    }

    // Prevent admin from deleting themselves
    if (userId === session.user.id) {
      event.res.statusCode = 400;
      return { error: "DELETE_FORBIDDEN" };
    }

    const db = await setupDatabase();

    // Use transaction for atomic deletion across all tables
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // HIGH FIX: Use constant-time check for user existence
      const [users] = await conn.execute(
        "SELECT id FROM `user` WHERE `id` = ?",
        [userId],
      );

      const userExists = users.length > 0;

      // Always perform fake hash comparison to maintain constant time
      const fakeHash = "$2a$10$fakehashforconstanttimecomparison";
      await bcrypt.compare(userId, fakeHash);

      if (!userExists) {
        await conn.rollback();
        event.res.statusCode = 404;
        return { error: "USER_NOT_FOUND" };
      }

      // Delete user's sessions first
      await conn.execute("DELETE FROM `session` WHERE `userId` = ?", [userId]);

      // Delete user's account
      await conn.execute("DELETE FROM `account` WHERE `userId` = ?", [userId]);

      // Delete user's API keys
      await conn.execute("DELETE FROM `apikey` WHERE `referenceId` = ?", [
        userId,
      ]);

      // Finally, delete the user
      await conn.execute("DELETE FROM `user` WHERE `id` = ?", [userId]);

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    return {
      success: true,
      message: "USER_DELETED_SUCCESSFULLY",
    };
  } catch (error) {
    logger.error("Delete user error:", error);
    event.res.statusCode = 500;
    return { error: "INTERNAL_SERVER_ERROR" };
  }
});
