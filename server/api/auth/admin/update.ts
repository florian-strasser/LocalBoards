import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getSession } from "../../../utils/auth";
import bcrypt from "bcryptjs";

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
    const { userId, name, email, password, role } = body;

    // Validate input
    if (!userId) {
      event.res.statusCode = 400;
      return { error: "User ID is required" };
    }

    if (name && (typeof name !== "string" || name.trim() === "")) {
      event.res.statusCode = 400;
      return { error: "Name must be a non-empty string" };
    }

    if (email && (typeof email !== "string" || !email.includes("@"))) {
      event.res.statusCode = 400;
      return { error: "Invalid email format" };
    }

    if (password && (typeof password !== "string" || password.length < 8)) {
      event.res.statusCode = 400;
      return { error: "Password must be at least 8 characters long" };
    }

    if (role && role !== "user" && role !== "admin") {
      event.res.statusCode = 400;
      return { error: "Invalid role. Must be 'user' or 'admin'" };
    }

    const db = await setupDatabase();

    // Get current user data
    const [users] = await db.execute("SELECT * FROM `user` WHERE `id` = ?", [
      userId,
    ]);

    if (users.length === 0) {
      event.res.statusCode = 404;
      return { error: "User not found" };
    }

    const user = users[0];

    // Update user data
    const updateFields = [];
    const updateValues = [];

    if (name && name !== user.name) {
      updateFields.push("`name` = ?");
      updateValues.push(name.trim());
    }

    if (email && email !== user.email) {
      // Check if new email is already taken
      const [existingUsers] = await db.execute(
        "SELECT * FROM `user` WHERE `email` = ? AND `id` != ?",
        [email, userId],
      );

      if (existingUsers.length > 0) {
        event.res.statusCode = 400;
        return { error: "Email is already taken" };
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
      await db.execute(
        `UPDATE \`user\` SET ${updateFields.join(", ")}, \`updatedAt\` = CURRENT_TIMESTAMP(3) WHERE \`id\` = ?`,
        updateValues,
      );
    }

    // Update password if provided
    if (password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      await db.execute(
        "UPDATE `account` SET `password` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `userId` = ?",
        [hashedPassword, userId],
      );
    }

    // Get updated user data
    const [updatedUsers] = await db.execute(
      "SELECT id, name, email, role, createdAt, updatedAt FROM `user` WHERE `id` = ?",
      [userId],
    );

    return {
      success: true,
      message: "User updated successfully",
      user: updatedUsers[0],
    };
  } catch (error) {
    console.error("Update user error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
