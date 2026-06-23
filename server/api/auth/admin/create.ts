import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getUserSession } from "../../../utils/auth";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const { name, email, password, role = "user" } = body;

    // Validate input with length limits for DoS protection
    if (!name || !email || !password) {
      event.res.statusCode = 400;
      return { error: "REQUIRED_FIELDS_MISSING" };
    }

    if (typeof name !== "string" || name.trim() === "" || name.length > 255) {
      event.res.statusCode = 400;
      return { error: "INVALID_NAME" };
    }

    if (
      typeof email !== "string" ||
      !emailRegex.test(email) ||
      email.length > 255
    ) {
      event.res.statusCode = 400;
      return { error: "INVALID_EMAIL" };
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 255
    ) {
      event.res.statusCode = 400;
      return { error: "INVALID_PASSWORD" };
    }

    if (role !== "user" && role !== "admin") {
      event.res.statusCode = 400;
      return { error: "INVALID_ROLE" };
    }

    const db = await setupDatabase();

    // CRITICAL FIX: Use constant-time check for user existence
    const [existingUsers] = await db.execute(
      "SELECT * FROM `user` WHERE `email` = ?",
      [email],
    );

    const userExists = existingUsers.length > 0;

    // Always perform fake hash comparison to maintain constant time
    const fakeHash = "$2a$10$fakehashforconstanttimecomparison";
    await bcrypt.compare(password, fakeHash);

    if (userExists) {
      event.res.statusCode = 400;
      return { error: "EMAIL_ALREADY_EXISTS" };
    }

    // Generate UUID for user
    const userId = uuidv4();

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Use transaction for atomic user+account creation
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Create user in database
      await conn.execute(
        "INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`, `role`) VALUES (?, ?, ?, ?, ?)",
        [userId, name.trim(), email, 1, role],
      );

      // Create account entry
      await conn.execute(
        "INSERT INTO `account` (`id`, `accountId`, `providerId`, `userId`, `password`) VALUES (?, ?, ?, ?, ?)",
        [uuidv4(), email, "local", userId, hashedPassword],
      );

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    return {
      success: true,
      message: "USER_CREATED_SUCCESSFULLY",
      user: {
        id: userId,
        name: name.trim(),
        email: email,
        role: role,
      },
    };
  } catch (error) {
    logger.error("Create user error:", error);
    event.res.statusCode = 500;
    return { error: "INTERNAL_SERVER_ERROR" };
  }
});
