import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getUserSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  // LOW FIX: Use generic error message
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    // Verify session first
    const session = await getUserSession(event);
    // HIGH FIX: Use generic error message
    if (!session) {
      event.res.statusCode = 401;
      return { error: "Unauthorized" };
    }

    const body = await readBody(event);
    const { name, image, role, emailNotifications } = body;

    // Validate input
    // HIGH FIX: Use generic error message
    if (!name || typeof name !== "string" || name.trim() === "") {
      event.res.statusCode = 400;
      return { error: "Invalid input" };
    }

    // MEDIUM FIX: Validate image field - must be valid URL, base64, relative path, or null
    if (image && typeof image === "string") {
      const lowerImage = image.trim().toLowerCase();
      // Block dangerous schemes (XSS protection)
      if (
        lowerImage.startsWith("javascript:") ||
        lowerImage.startsWith("vbscript:") ||
        (lowerImage.startsWith("data:") &&
          !lowerImage.startsWith("data:image/"))
      ) {
        event.res.statusCode = 400;
        return { error: "Invalid input" };
      }
      // Allow http, https, image data URIs, relative paths (/, ./, ../), or empty
      const isUrl = image.startsWith("http://") || image.startsWith("https://");
      const isBase64 = image.startsWith("data:image/");
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

    // Optional self role change. Only an admin may change their own role (this
    // is the "demote myself to a normal user" case) — a normal user changing
    // their own role would be privilege escalation, so it's rejected. Demoting
    // the last admin is blocked so an instance can't end up with no admins.
    const fields = ["`name` = ?", "`image` = ?"];
    const values: any[] = [name.trim(), image || null];
    if (role !== undefined && role !== session.user.role) {
      if (session.user.role !== "admin") {
        event.res.statusCode = 403;
        return { error: "Forbidden" };
      }
      if (role !== "user" && role !== "admin") {
        event.res.statusCode = 400;
        return { error: "Invalid input" };
      }
      if (role === "user") {
        const [adminRows]: any = await db.execute(
          "SELECT COUNT(*) AS c FROM `user` WHERE `role` = 'admin'",
        );
        if ((adminRows[0]?.c ?? 0) <= 1) {
          event.res.statusCode = 400;
          return { error: "LAST_ADMIN" };
        }
      }
      fields.push("`role` = ?");
      values.push(role);
    }

    // Let a user turn notification e-mails off (or back on) for themselves.
    if (emailNotifications !== undefined) {
      fields.push("`emailNotifications` = ?");
      values.push(emailNotifications ? 1 : 0);
    }
    values.push(session.user.id);

    // Update user in database
    await db.execute(
      `UPDATE \`user\` SET ${fields.join(", ")}, \`updatedAt\` = CURRENT_TIMESTAMP(3) WHERE \`id\` = ?`,
      values,
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
    logger.error("Update user error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
