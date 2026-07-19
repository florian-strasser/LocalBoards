import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { getUserSession } from "../../../utils/auth";
import { v4 as uuidv4 } from "uuid";

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    // Verify session first
    const session = await getUserSession(event);
    if (!session) {
      event.res.statusCode = 401;
      return { error: "UNAUTHORIZED" };
    }

    const body = await readBody(event);
    const { name, expiresIn, readOnly } = body;

    // Validate input with length limits
    if (
      !name ||
      typeof name !== "string" ||
      name.trim() === "" ||
      name.length > 255
    ) {
      event.res.statusCode = 400;
      return { error: "INVALID_NAME" };
    }

    // Validate expiresIn - must be positive number, max 365 days (in seconds: 365*24*60*60 = 31536000)
    if (expiresIn !== undefined && expiresIn !== null) {
      if (
        typeof expiresIn !== "number" ||
        expiresIn <= 0 ||
        expiresIn > 31536000
      ) {
        event.res.statusCode = 400;
        return { error: "INVALID_EXPIRES_IN" };
      }
    }

    const db = await setupDatabase();

    // Generate API key (32 character random string)
    const apiKey = uuidv4().replace(/-/g, "").substring(0, 32);
    const keyId = uuidv4();
    const keyStart = apiKey.substring(0, 8); // First 8 characters for display

    // Calculate expiration date
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

    // A read-only key is scoped to ["read"]; a full key stores no scopes (null =
    // unrestricted). The MCP layer rejects write tools when "write" is absent.
    const permissions = readOnly ? JSON.stringify(["read"]) : null;

    // Store only the SHA-256 hash of the key, never the plaintext, so a database
    // leak can't expose usable keys. `start` keeps the first 8 chars for display.
    await db.execute(
      "INSERT INTO `apikey` (`id`, `name`, `start`, `key`, `expiresAt`, `referenceId`, `permissions`) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        keyId,
        name.trim(),
        keyStart,
        hashApiKey(apiKey),
        expiresAt,
        session.user.id, // referenceId stores the userId
        permissions,
      ],
    );

    // Return the plaintext key this one time only — it cannot be recovered later
    // (the database stores just the hash).
    return {
      success: true,
      message: "API_KEY_CREATED_SUCCESSFULLY",
      id: keyId,
      name: name.trim(),
      key: apiKey,
      start: keyStart,
      expiresAt: expiresAt,
    };
  } catch (error) {
    logger.error("Create API key error:", error);
    event.res.statusCode = 500;
    return { error: "INTERNAL_SERVER_ERROR" };
  }
});
