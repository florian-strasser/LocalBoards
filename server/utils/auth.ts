import { setupDatabase } from "../../app/lib/databaseSetup";
import { v4 as uuidv4 } from "uuid";
import { setCookie } from "h3";

export async function createSession(event: any, userId: string) {
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
        userId,
      ],
    );

    // Set session cookie
    setCookie(event, "session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 1 day in seconds
      path: "/",
    });

    return {
      sessionToken,
      user: {
        id: userId,
      },
    };
  } catch (error) {
    console.error("Session creation error:", error);
    return { error: "Failed to create session" };
  }
}

export async function verifyApiKey(apiKey: string) {
  try {
    const db = await setupDatabase();

    // Check if API key exists and is valid
    const [keys] = await db.execute(
      "SELECT * FROM `apikey` WHERE `key` = ? AND (`enabled` IS NULL OR `enabled` = 1)",
      [apiKey],
    );

    if (keys.length === 0) {
      return { error: "Invalid API key" };
    }

    const key = keys[0];

    // Check if key is expired
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return { error: "API key expired" };
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
    return { error: "Internal server error" };
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
