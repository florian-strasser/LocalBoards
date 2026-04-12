import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getSession } from "../../utils/auth";
import bcrypt from "bcryptjs";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    // Verify session first
    const session = await getSession(event);
    if (!session) {
      event.res.statusCode = 401;
      return { error: "Unauthorized - No active session" };
    }

    const body = await readBody(event);
    const { oldPassword, newPassword, revokeOtherSessions = true } = body;

    // Validate input
    if (!oldPassword || !newPassword) {
      event.res.statusCode = 400;
      return { error: "Both old and new passwords are required" };
    }

    if (newPassword.length < 8) {
      event.res.statusCode = 400;
      return { error: "New password must be at least 8 characters long" };
    }

    const db = await setupDatabase();

    // Get the user's current password hash
    const [accounts] = await db.execute(
      "SELECT * FROM `account` WHERE `userId` = ? AND `providerId` = ?",
      [session.user.id, "local"],
    );

    if (accounts.length === 0) {
      event.res.statusCode = 404;
      return { error: "LOCAL_ACCOUNT_NOT_FOUND" };
    }

    const account = accounts[0];

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, account.password);
    if (!isPasswordValid) {
      event.res.statusCode = 401;
      return { error: "INVALID_OLD_PASSWORD" };
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await db.execute(
      "UPDATE `account` SET `password` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = ?",
      [hashedPassword, account.id],
    );

    // Revoke other sessions if requested
    if (revokeOtherSessions) {
      await db.execute(
        "DELETE FROM `session` WHERE `userId` = ? AND `token` != ?",
        [session.user.id, session.session.token],
      );
    }

    return {
      success: true,
      message: "PASSWORD_UPDATED_SUCCESSFULLY",
      sessionsRevoked: revokeOtherSessions,
    };
  } catch (error) {
    console.error("Update password error:", error);
    event.res.statusCode = 500;
    return { error: "INTERNAL_SERVER_ERROR" };
  }
});
