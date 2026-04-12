import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getSession } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    // Verify session and admin role
    const session = await getSession(event);
    if (!session) {
      event.res.statusCode = 401;
      return { error: "Unauthorized - No active session" };
    }

    if (session.user.role !== "admin") {
      event.res.statusCode = 403;
      return { error: "Forbidden - Admin role required" };
    }

    const body = await readBody(event);
    const { userId } = body;

    // Validate input
    if (!userId) {
      event.res.statusCode = 400;
      return { error: "User ID is required" };
    }

    // Prevent admin from deleting themselves
    if (userId === session.user.id) {
      event.res.statusCode = 400;
      return { error: "Cannot delete your own account" };
    }

    const db = await setupDatabase();

    // Check if user exists
    const [users] = await db.execute("SELECT id FROM `user` WHERE `id` = ?", [
      userId,
    ]);

    if (users.length === 0) {
      event.res.statusCode = 404;
      return { error: "User not found" };
    }

    // Delete user's sessions first
    await db.execute("DELETE FROM `session` WHERE `userId` = ?", [userId]);

    // Delete user's account
    await db.execute("DELETE FROM `account` WHERE `userId` = ?", [userId]);

    // Delete user's API keys
    await db.execute("DELETE FROM `apikey` WHERE `referenceId` = ?", [userId]);

    // Finally, delete the user
    await db.execute("DELETE FROM `user` WHERE `id` = ?", [userId]);

    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    console.error("Delete user error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
