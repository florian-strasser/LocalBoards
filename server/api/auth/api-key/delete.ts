import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getSession } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    // Verify session first
    const session = await getSession(event);
    if (!session) {
      event.res.statusCode = 401;
      return { error: "Unauthorized - No active session" };
    }

    const body = await readBody(event);
    const { keyId } = body;

    // Validate input
    if (!keyId || typeof keyId !== "string" || keyId.trim() === "") {
      event.res.statusCode = 400;
      return { error: "Key ID is required" };
    }

    const db = await setupDatabase();

    // First, verify the key belongs to the current user
    const [keys] = await db.execute(
      "SELECT id FROM `apikey` WHERE `id` = ? AND `referenceId` = ?",
      [keyId, session.user.id],
    );

    if (keys.length === 0) {
      event.res.statusCode = 404;
      return { error: "API key not found or doesn't belong to you" };
    }

    // Delete the API key
    await db.execute("DELETE FROM `apikey` WHERE `id` = ?", [keyId]);

    return {
      success: true,
      message: "API key deleted successfully",
    };
  } catch (error) {
    console.error("Delete API key error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
