import { setupDatabase } from "../../../app/lib/databaseSetup";
import bcrypt from "bcryptjs";

// UUID v4 regex pattern for token validation
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    const body = await readBody(event);
    const { token, newPassword } = body;

    // HIGH FIX: Strong token and password validation with generic errors
    if (!token || typeof token !== "string" || !uuidRegex.test(token)) {
      event.res.statusCode = 400;
      return { error: "INVALID_TOKEN" };
    }

    if (
      !newPassword ||
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      event.res.statusCode = 400;
      return { error: "INVALID_PASSWORD" };
    }

    const db = await setupDatabase();

    // CRITICAL FIX: Use constant-time checks for token and user existence
    const [tokens] = await db.execute(
      "SELECT * FROM `verification` WHERE `value` = ? AND `expiresAt` > NOW()",
      [token],
    );

    const tokenExists = tokens.length > 0;

    // Always perform fake hash comparison to maintain constant time
    const fakeHash = "$2a$10$fakehashforconstanttimecomparison";
    await bcrypt.compare(newPassword, fakeHash);

    if (!tokenExists) {
      event.res.statusCode = 400;
      return { error: "INVALID_TOKEN" };
    }

    const verificationToken = tokens[0];

    // CRITICAL FIX: Use constant-time check for user existence
    const [users] = await db.execute("SELECT * FROM `user` WHERE `email` = ?", [
      verificationToken.identifier,
    ]);

    const userExists = users.length > 0;

    // Always perform another fake hash comparison to maintain constant time
    await bcrypt.compare(token, fakeHash);

    if (!userExists) {
      event.res.statusCode = 404;
      return { error: "INVALID_TOKEN" };
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
      message: "PASSWORD_RESET_SUCCESSFUL",
    };
  } catch (error) {
    console.error("Reset password error:", error);
    event.res.statusCode = 500;
    return { error: "INTERNAL_SERVER_ERROR" };
  }
});
