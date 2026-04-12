import { setupDatabase } from "../../../app/lib/databaseSetup";

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
    if (!sessionToken) {
      event.res.statusCode = 401;
      return { error: "No session token provided" };
    }

    const db = await setupDatabase();
    // Check if session exists and is valid
    const [sessions] = await db.execute(
      "SELECT * FROM `session` WHERE `token` = ? AND `expiresAt` > NOW()",
      [sessionToken],
    );

    if (sessions.length === 0) {
      event.res.statusCode = 401;
      return { error: "Invalid or expired session" };
    }

    const session = sessions[0];
    // Fetch user details
    const [users] = await db.execute(
      "SELECT id, name, email, role, banned, banReason, image, banExpires, displayUsername FROM `user` WHERE `id` = ?",
      [session.userId],
    );

    if (users.length === 0) {
      event.res.statusCode = 401;
      return { error: "User not found" };
    }

    const user = users[0];

    // Check if user is banned
    if (user.banned) {
      event.res.statusCode = 403;
      return {
        error: "User is banned",
        banReason: user.banReason,
        banExpires: user.banExpires,
      };
    }

    // Return session and user data
    return {
      data: {
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
          token: session.token,
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
