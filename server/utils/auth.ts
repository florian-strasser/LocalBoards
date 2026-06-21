import { setupDatabase } from "../../app/lib/databaseSetup";
import { v4 as uuidv4 } from "uuid";
import { setCookie } from "h3";
import bcrypt from "bcryptjs";
import { resolveBoardAccess, type BoardAccess } from "./boardAccess";

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

// A failed authorization check carries the HTTP status and a (deliberately
// generic) error message the caller should return verbatim.
export type AuthFailure = { ok: false; status: number; error: string };

const UNAUTHORIZED: AuthFailure = { ok: false, status: 403, error: "Unauthorized access" };

export type UserResolution =
  | AuthFailure
  | { ok: true; userId: string; viaApiKey: boolean };

/**
 * Resolve the authenticated user from either an `x-api-key` header or the
 * session cookie. This is the boilerplate every data endpoint used to repeat
 * inline. Returns the userId and whether it came from an API key (some
 * endpoints emit socket events only for API-key calls).
 */
export async function resolveUserId(event: any): Promise<UserResolution> {
  const apiKey = event.headers.get("x-api-key");

  let userIdFromApiKey: string | null = null;
  if (apiKey) {
    const data = await verifyApiKey(apiKey);
    if (data.error) return UNAUTHORIZED;
    userIdFromApiKey = data.key.userId;
  }

  const session = await getSession(event);

  if (!userIdFromApiKey && !session) return UNAUTHORIZED;

  const userId = userIdFromApiKey || session?.user?.id;
  if (!userId) return UNAUTHORIZED;

  return { ok: true, userId: String(userId), viaApiKey: !!userIdFromApiKey };
}

export type AccessDecision =
  | AuthFailure
  | { ok: true; access: Exclude<BoardAccess, "none"> };

// Options for the strictness of an "edit" check.
export interface BoardAccessOptions {
  // When false, a `public` board does NOT grant write access — only the owner
  // or an `edit` invitation does. Defaults to true (public boards are writable
  // by anyone), matching the predominant endpoint behaviour. The board-record
  // update (board.ts POST) and area deletion use `publicWrite: false`.
  publicWrite?: boolean;
}

/**
 * Decide access for an already-loaded board row. This is the reusable core for
 * endpoints that reach the board via a join (card → area → board) and therefore
 * don't have a boardId up front. It loads the user's invitation only when it can
 * matter and returns the exact status/message to return on denial.
 *
 * @param required  "read" allows owner/invited/public; "edit" requires write.
 */
export async function authorizeBoard(
  db: any,
  board: any,
  userId: string,
  required: "read" | "edit",
  opts: BoardAccessOptions = {},
): Promise<AccessDecision> {
  const publicWrite = opts.publicWrite !== false;
  const isOwner = !!userId && board.user === userId;

  // Load the invitation for non-owners whenever it could affect the outcome:
  // for private boards (always), and for strict edit checks (where an `edit`
  // invitation is the only non-owner path to write access).
  let invitation = null;
  if (!isOwner) {
    const needInvitation =
      board.status === "private" || (required === "edit" && !publicWrite);
    if (needInvitation) {
      const [invitationRows]: any = await db.execute(
        "SELECT permission FROM invitations WHERE board = ? AND user = ?",
        [board.id, userId],
      );
      invitation = invitationRows[0] || null;
    }
  }

  // Strict edit (no public write): owner or an `edit` invitation only.
  if (required === "edit" && !publicWrite) {
    if (isOwner || invitation?.permission === "edit") {
      return { ok: true, access: "edit" };
    }
    return UNAUTHORIZED;
  }

  const access = resolveBoardAccess(board, userId, invitation);
  if (access === "none") return UNAUTHORIZED;
  if (required === "edit" && access !== "edit") return UNAUTHORIZED;
  return { ok: true, access };
}

export type BoardAccessResolution =
  | AuthFailure
  | {
      ok: true;
      userId: string;
      viaApiKey: boolean;
      board: any;
      access: Exclude<BoardAccess, "none">;
    };

/**
 * Resolve the user, load the board by id, and decide access via
 * `authorizeBoard`. For endpoints that already have a boardId. Returns
 * `ok: false` with the exact status/message the endpoint should return.
 */
export async function requireBoardAccess(
  event: any,
  boardId: any,
  required: "read" | "edit",
  opts: BoardAccessOptions = {},
): Promise<BoardAccessResolution> {
  // Validate the board id is a positive integer.
  if (!boardId || isNaN(Number(boardId)) || Number(boardId) <= 0) {
    return { ok: false, status: 400, error: "Invalid board ID" };
  }

  const auth = await resolveUserId(event);
  if (!auth.ok) return auth;

  const db = setupDatabase();

  const [rows]: any = await db.execute("SELECT * FROM boards WHERE id = ?", [
    boardId,
  ]);
  const board = rows[0];

  // Generic 404 to avoid board enumeration.
  if (!board) return { ok: false, status: 404, error: "Resource not found" };

  const decision = await authorizeBoard(db, board, auth.userId, required, opts);
  if (!decision.ok) return decision;

  return {
    ok: true,
    userId: auth.userId,
    viaApiKey: auth.viaApiKey,
    board,
    access: decision.access,
  };
}
