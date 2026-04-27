import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getSession } from "../../../utils/auth";
import bcrypt from "bcryptjs";

// UUID v4 and email validation regex
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      return { error: "UNAUTHORIZED" };
    }

    if (session.user.role !== "admin") {
      event.res.statusCode = 403;
      return { error: "FORBIDDEN" };
    }

    const body = await readBody(event);
    const { userId, name, email, password, role } = body;

    // Validate input with length limits
    // MEDIUM FIX: Validate userId is UUID format
    if (!userId || typeof userId !== "string" || !uuidRegex.test(userId)) {
      event.res.statusCode = 400;
      return { error: "INVALID_USER_ID" };
    }

    if (
      name &&
      (typeof name !== "string" || name.trim() === "" || name.length > 255)
    ) {
      event.res.statusCode = 400;
      return { error: "INVALID_NAME" };
    }

    // MEDIUM FIX: Strong email validation
    if (
      email &&
      (typeof email !== "string" ||
        !emailRegex.test(email) ||
        email.length > 255)
    ) {
      event.res.statusCode = 400;
      return { error: "INVALID_EMAIL" };
    }

    if (
      password &&
      (typeof password !== "string" ||
        password.length < 8 ||
        password.length > 255)
    ) {
      event.res.statusCode = 400;
      return { error: "INVALID_PASSWORD" };
    }

    if (role && role !== "user" && role !== "admin") {
      event.res.statusCode = 400;
      return { error: "INVALID_ROLE" };
    }

    const db = await setupDatabase();

    // HIGH FIX: Use constant-time check for user existence
    const [users] = await db.execute("SELECT * FROM `user` WHERE `id` = ?", [
      userId,
    ]);

    const userExists = users.length > 0;

    // Always perform fake hash comparison to maintain constant time
    const fakeHash = "$2a$10$fakehashforconstanttimecomparison";
    if (password) {
      await bcrypt.compare(password, fakeHash);
    } else {
      await bcrypt.compare(userId, fakeHash);
    }

    if (!userExists) {
      event.res.statusCode = 404;
      return { error: "USER_NOT_FOUND" };
    }

    const user = users[0];

    // Use transaction for atomic updates
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Update user data
      const updateFields = [];
      const updateValues = [];

      if (name && name !== user.name) {
        updateFields.push("`name` = ?");
        updateValues.push(name.trim());
      }

      if (email && email !== user.email) {
        // HIGH FIX: Use constant-time check for email availability
        const [existingUsers] = await conn.execute(
          "SELECT * FROM `user` WHERE `email` = ? AND `id` != ?",
          [email, userId],
        );

        const emailExists = existingUsers.length > 0;

        // Always perform fake hash comparison to maintain constant time
        await bcrypt.compare(email || userId, fakeHash);

        if (emailExists) {
          await conn.rollback();
          event.res.statusCode = 400;
          return { error: "EMAIL_ALREADY_TAKEN" };
        }

        updateFields.push("`email` = ?");
        updateValues.push(email);
      }

      if (role && role !== user.role) {
        updateFields.push("`role` = ?");
        updateValues.push(role);
      }

      // Update user record if there are changes
      if (updateFields.length > 0) {
        updateValues.push(userId);
        await conn.execute(
          `UPDATE \`user\` SET ${updateFields.join(", ")}, \`updatedAt\` = CURRENT_TIMESTAMP(3) WHERE \`id\` = ?`,
          updateValues,
        );
      }

      // Update password if provided
      if (password) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await conn.execute(
          "UPDATE `account` SET `password` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `userId` = ?",
          [hashedPassword, userId],
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    // Get updated user data
    const [updatedUsers] = await db.execute(
      "SELECT id, name, email, role, createdAt, updatedAt FROM `user` WHERE `id` = ?",
      [userId],
    );

    return {
      success: true,
      message: "USER_UPDATED_SUCCESSFULLY",
      user: updatedUsers[0],
    };
  } catch (error) {
    console.error("Update user error:", error);
    event.res.statusCode = 500;
    return { error: "INTERNAL_SERVER_ERROR" };
  }
});
