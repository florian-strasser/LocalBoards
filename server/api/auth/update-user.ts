import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  // LOW FIX: Use generic error message
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    // Verify session first
    const session = await getSession(event);
    // HIGH FIX: Use generic error message
    if (!session) {
      event.res.statusCode = 401;
      return { error: "Unauthorized" };
    }

    const body = await readBody(event);
    const { name, image } = body;

    // Validate input
    // HIGH FIX: Use generic error message
    if (!name || typeof name !== "string" || name.trim() === "") {
      event.res.statusCode = 400;
      return { error: "Invalid input" };
    }

    // MEDIUM FIX: Validate image field - must be valid URL, base64, relative path, or null
    if (image && typeof image === "string") {
      // Block potentially dangerous schemes (XSS protection)
      if (image.trim().toLowerCase().startsWith("javascript:")) {
        event.res.statusCode = 400;
        return { error: "Invalid input" };
      }
      // Allow http, https, data URI, relative paths (/, ./, ../), or empty
      const isUrl = image.startsWith("http://") || image.startsWith("https://");
      const isBase64 = image.startsWith("data:");
      const isRelativePath =
        image.startsWith("/") ||
        image.startsWith("./") ||
        image.startsWith("../");
      if (!isUrl && !isBase64 && !isRelativePath) {
        event.res.statusCode = 400;
        return { error: "Invalid input" };
      }
      // Sanitize: limit length to prevent DoS with huge base64
      if (image.length > 1000000) {
        event.res.statusCode = 400;
        return { error: "Invalid input" };
      }
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
      // HIGH FIX: Use generic error message (should not happen with valid session)
      event.res.statusCode = 404;
      return { error: "Resource not found" };
    }

    return {
      success: true,
      message: "User updated successfully",
      user: users[0],
    };
  } catch (error) {
    console.error("Update user error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
