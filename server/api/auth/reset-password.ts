import { setupDatabase } from "../../../app/lib/databaseSetup";
import bcrypt from "bcryptjs";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    const body = await readBody(event);
    const { token, newPassword } = body;

    // Validate input
    if (!token || typeof token !== "string") {
      event.res.statusCode = 400;
      return { error: "Invalid or missing token" };
    }

    if (
      !newPassword ||
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      event.res.statusCode = 400;
      return { error: "Password must be at least 8 characters long" };
    }

    const db = await setupDatabase();

    // Check if token exists and is valid
    const [tokens] = await db.execute(
      "SELECT * FROM `verification` WHERE `value` = ? AND `expiresAt` > NOW()",
      [token],
    );

    if (tokens.length === 0) {
      event.res.statusCode = 400;
      return { error: "Invalid or expired token" };
    }

    const verificationToken = tokens[0];

    // Get user by email
    const [users] = await db.execute("SELECT * FROM `user` WHERE `email` = ?", [
      verificationToken.identifier,
    ]);

    if (users.length === 0) {
      event.res.statusCode = 404;
      return { error: "User not found" };
    }

    const user = users[0];

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await db.execute(
      "UPDATE `account` SET `password` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `userId` = ?",
      [hashedPassword, user.id],
    );

    // Delete the used token
    await db.execute("DELETE FROM `verification` WHERE `value` = ?", [token]);

    // Delete all user sessions to force login with new password
    await db.execute("DELETE FROM `session` WHERE `userId` = ?", [user.id]);

    return {
      success: true,
      message: "Password has been reset successfully",
    };
  } catch (error) {
    console.error("Reset password error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
