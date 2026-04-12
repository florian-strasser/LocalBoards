import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "METHOD_NOT_ALLOWED" };
  }

  try {
    // Verify session first
    const session = await getSession(event);
    if (!session) {
      event.res.statusCode = 401;
      return { error: "UNAUTHORIZED" };
    }

    const body = await readBody(event);
    const { name, image } = body;

    // Validate input
    if (!name || typeof name !== "string" || name.trim() === "") {
      event.res.statusCode = 400;
      return { error: "NAME_IS_REQUIRED" };
    }

    const db = await setupDatabase();

    // Update user in database
    await db.execute(
      "UPDATE `user` SET `name` = ?, `image` = ?, `updatedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = ?",
      [name.trim(), image || null, session.user.id],
    );

    // Return updated user data
    const [users] = await db.execute(
      "SELECT id, name, email, role, image, displayUsername FROM `user` WHERE `id` = ?",
      [session.user.id],
    );

    if (users.length === 0) {
      event.res.statusCode = 404;
      return { error: "USER_NOT_FOUND" };
    }

    return {
      success: true,
      message: "USER_UPDATED_SUCCESSFULLY",
      user: users[0],
    };
  } catch (error) {
    console.error("Update user error:", error);
    event.res.statusCode = 500;
    return { error: "INTERNAL_SERVER_ERROR" };
  }
});
