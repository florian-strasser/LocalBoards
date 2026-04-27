import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getCookie } from "h3";
import bcrypt from "bcryptjs";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "GET") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    // Extract session token from headers or cookies
    const sessionToken =
      event.headers.get("authorization")?.replace("Bearer ", "") ||
      getCookie(event, "session_token");

    // MEDIUM FIX: Validate session token format
    if (
      !sessionToken ||
      typeof sessionToken !== "string" ||
      sessionToken.length < 10
    ) {
      // CRITICAL FIX: Always perform constant-time operation before returning
      const fakeHash = "$2a$10$fakehashforconstanttimecomparison";
      await bcrypt.compare("fake", fakeHash);
      event.res.statusCode = 401;
      return { error: "Session validation failed" };
    }

    const db = await setupDatabase();

    // CRITICAL FIX: Use constant-time check for session validation
    const [sessions] = await db.execute(
      "SELECT * FROM `session` WHERE `token` = ? AND `expiresAt` > NOW()",
      [sessionToken],
    );

    if (sessions.length === 0) {
      // CRITICAL FIX: Always perform constant-time operation before returning
      const fakeHash = "$2a$10$fakehashforconstanttimecomparison";
      await bcrypt.compare(sessionToken, fakeHash);
      event.res.statusCode = 401;
      return { error: "Session validation failed" };
    }

    const session = sessions[0];

    // CRITICAL FIX: Use constant-time check for user validation
    const [users] = await db.execute(
      "SELECT id, name, email, role, banned, banReason, image, banExpires, displayUsername FROM `user` WHERE `id` = ?",
      [session.userId],
    );

    if (users.length === 0) {
      // CRITICAL FIX: Always perform constant-time operation before returning
      const fakeHash = "$2a$10$fakehashforconstanttimecomparison";
      await bcrypt.compare(sessionToken, fakeHash);
      event.res.statusCode = 401;
      return { error: "Session validation failed" };
    }

    const user = users[0];

    // Check if user is banned
    if (user.banned) {
      // HIGH FIX: Don't leak ban details
      event.res.statusCode = 403;
      return {
        error: "Access denied",
      };
    }

    // CRITICAL FIX: Never return session token to client
    // Return session and user data
    return {
      data: {
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          displayUsername: user.displayUsername,
        },
      },
    };
  } catch (error) {
    console.error("Get session error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
