import { setupDatabase } from "../../app/lib/databaseSetup";
import { v4 as uuidv4 } from "uuid";
import { setCookie } from "h3";
import bcrypt from "bcryptjs";

// UUID v4 regex for validation
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createSession(event: any, userId: string) {
  // Accept string or number, convert to string for backward compatibility
  const userIdStr = String(userId);

  // Validate userId is a non-empty string
  if (!userIdStr || typeof userIdStr !== "string") {
    console.error("Invalid userId for session creation");
    return { error: "INVALID_USER_ID" };
  }

  try {
    const db = await setupDatabase();

    // Generate session token
    const sessionToken = uuidv4();

    // Create session in database
    await db.execute(
      "INSERT INTO `session` (`id`, `expiresAt`, `token`, `userId`) VALUES (?, ?, ?, ?)",
      [
        uuidv4(),
        new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        sessionToken,
        userIdStr,
      ],
    );

    // Set session cookie
    const isProduction =
      process.env.NODE_ENV === "production" || process.env.NODE_ENV === "prod";
    const isSecureContext =
      process.env.NODE_ENV === "production" ||
      process.env.SSL === "true" ||
      event.headers["x-forwarded-proto"] === "https";

    setCookie(event, "session_token", sessionToken, {
      httpOnly: true,
      secure: isSecureContext,
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return {
      sessionToken,
      user: {
        id: userIdStr,
      },
    };
  } catch (error) {
    console.error("Session creation error:", error);
    return { error: "SESSION_CREATION_FAILED" };
  }
}

export async function verifyApiKey(apiKey: string) {
  // Validate API key input
  if (!apiKey || typeof apiKey !== "string" || apiKey.length > 64) {
    // Always perform constant-time operation before returning
    const fakeHash = "$2a$10$fakehashforconstanttimecomparison";
    await bcrypt.compare("fake", fakeHash);
    return { error: "INVALID_API_KEY" };
  }

  try {
    const db = await setupDatabase();

    // Check if API key exists and is valid
    const [keys] = await db.execute(
      "SELECT * FROM `apikey` WHERE `key` = ? AND (`enabled` IS NULL OR `enabled` = 1)",
      [apiKey],
    );

    const keyExists = keys.length > 0;
    let key = null;

    // Always perform fake hash comparison to maintain constant time
    const fakeHash = "$2a$10$fakehashforconstanttimecomparison";
    await bcrypt.compare(apiKey, fakeHash);

    if (!keyExists) {
      // Also perform the expiration check timing to maintain consistency
      const fakeDate = new Date();
      if (fakeDate < new Date()) {
        await bcrypt.compare(apiKey, fakeHash);
      }
      return { error: "INVALID_API_KEY" };
    }

    key = keys[0];

    // Check if key is expired - always perform the check for constant timing
    const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();

    // Perform another fake operation to maintain timing consistency
    await bcrypt.compare(key.id, fakeHash);

    if (isExpired) {
      return { error: "INVALID_API_KEY" };
    }

    return {
      key: {
        id: key.id,
        userId: key.referenceId, // referenceId stores the userId
        name: key.name,
        permissions: key.permissions ? JSON.parse(key.permissions) : null,
        metadata: key.metadata ? JSON.parse(key.metadata) : null,
      },
    };
  } catch (error) {
    console.error("API key verification error:", error);
    return { error: "API_KEY_VERIFICATION_FAILED" };
  }
}

export async function getSession(event: any) {
  try {
    const { data: session } = await $fetch("/api/auth/get-session", {
      headers: event.headers,
    });
    return session;
  } catch (error) {
    console.error("Session fetch error:", error);
    return null;
  }
}

export async function getApiKeyUser(event: any) {
  try {
    // Extract API key from headers
    const apiKey = event.headers.get("x-api-key");

    if (!apiKey) {
      return null;
    }

    // Verify the API key
    const result = await verifyApiKey(apiKey);

    if (result.error) {
      console.error("API key verification failed:", result.error);
      return null;
    }

    // Return user information from the API key
    return {
      user: {
        id: result.key.userId,
      },
    };
  } catch (error) {
    console.error("getApiKeyUser error:", error);
    return null;
  }
}
