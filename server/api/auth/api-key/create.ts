import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getSession } from "../../../utils/auth";
import { v4 as uuidv4 } from "uuid";

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
    const { name, expiresIn } = body;

    // Validate input
    if (!name || typeof name !== "string" || name.trim() === "") {
      event.res.statusCode = 400;
      return { error: "Name is required and must be a non-empty string" };
    }

    const db = await setupDatabase();

    // Generate API key (32 character random string)
    const apiKey = uuidv4().replace(/-/g, "").substring(0, 32);
    const keyStart = apiKey.substring(0, 8); // First 8 characters for display

    // Calculate expiration date
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

    // Create API key in database
    await db.execute(
      "INSERT INTO `apikey` (`id`, `name`, `start`, `key`, `expiresAt`, `referenceId`) VALUES (?, ?, ?, ?, ?, ?)",
      [
        uuidv4(),
        name.trim(),
        keyStart,
        apiKey,
        expiresAt,
        session.user.id, // referenceId stores the userId
      ],
    );

    // Return the created API key (only show once!)
    return {
      success: true,
      message: "API key created successfully",
      key: apiKey,
      id: uuidv4(), // Return a temporary ID (actual ID is not needed for client)
      name: name.trim(),
      start: keyStart,
      expiresAt: expiresAt,
    };
  } catch (error) {
    console.error("Create API key error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
