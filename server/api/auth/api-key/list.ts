import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getSession } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "GET") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    // Verify session first
    const session = await getSession(event);
    if (!session) {
      event.res.statusCode = 401;
      return { error: "UNAUTHORIZED" };
    }

    const db = await setupDatabase();

    // Get all API keys for the current user
    const [keys] = await db.execute(
      "SELECT id, name, `start`, expiresAt FROM `apikey` WHERE `referenceId` = ? ORDER BY createdAt DESC",
      [session.user.id],
    );

    // Format the keys for response
    const apiKeys = keys.map((key) => ({
      id: key.id,
      name: key.name,
      start: key.start,
      expiresAt: key.expiresAt,
    }));

    return {
      success: true,
      apiKeys: apiKeys,
    };
  } catch (error) {
    console.error("List API keys error:", error);
    event.res.statusCode = 500;
    return { error: "INTERNAL_SERVER_ERROR" };
  }
});
