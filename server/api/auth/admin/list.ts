import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getUserSession } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "GET") {
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

    const db = await setupDatabase();

    // Get all users from database
    const [users] = await db.execute(
      "SELECT id, name, email, image, role, createdAt, updatedAt FROM `user` ORDER BY createdAt DESC",
    );

    // Format the users for response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      username: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return {
      success: true,
      users: formattedUsers,
    };
  } catch (error) {
    logger.error("List users error:", error);
    event.res.statusCode = 500;
    return { error: "INTERNAL_SERVER_ERROR" };
  }
});
