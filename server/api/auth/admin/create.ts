import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getSession } from "../../../utils/auth";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

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
    const { name, email, password, role = "user" } = body;

    // Validate input
    if (!name || !email || !password) {
      event.res.statusCode = 400;
      return { error: "Name, email, and password are required" };
    }

    if (typeof name !== "string" || name.trim() === "") {
      event.res.statusCode = 400;
      return { error: "Name must be a non-empty string" };
    }

    if (typeof email !== "string" || !email.includes("@")) {
      event.res.statusCode = 400;
      return { error: "Invalid email format" };
    }

    if (typeof password !== "string" || password.length < 8) {
      event.res.statusCode = 400;
      return { error: "Password must be at least 8 characters long" };
    }

    if (role !== "user" && role !== "admin") {
      event.res.statusCode = 400;
      return { error: "Invalid role. Must be 'user' or 'admin'" };
    }

    const db = await setupDatabase();

    // Check if user already exists
    const [existingUsers] = await db.execute(
      "SELECT * FROM `user` WHERE `email` = ?",
      [email],
    );

    if (existingUsers.length > 0) {
      event.res.statusCode = 400;
      return { error: "User with this email already exists" };
    }

    // Generate UUID for user
    const userId = uuidv4();

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in database
    await db.execute(
      "INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`, `role`) VALUES (?, ?, ?, ?, ?)",
      [userId, name.trim(), email, 1, role],
    );

    // Create account entry
    await db.execute(
      "INSERT INTO `account` (`id`, `accountId`, `providerId`, `userId`, `password`) VALUES (?, ?, ?, ?, ?)",
      [uuidv4(), email, "local", userId, hashedPassword],
    );

    return {
      success: true,
      message: "User created successfully",
      user: {
        id: userId,
        name: name.trim(),
        email: email,
        role: role,
      },
    };
  } catch (error) {
    console.error("Create user error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
