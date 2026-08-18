import { defineEventHandler, readBody, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { sendEmail } from "../../../app/lib/sendEmail";
import {
  getBoardInviteEmail,
  getBoardInviteSignupEmail,
} from "../../utils/translations";
import { createInviteToken, hashInviteToken } from "../../utils/inviteToken";

const runtimeConfig = useRuntimeConfig();
const appName = runtimeConfig.appName;
const baseURL = runtimeConfig.boardsUrl;
const defaultLanguage = runtimeConfig.language;

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  // Resolve the authenticated user (API key or session). All invite operations
  // are owner-only, enforced per-method below via `board.user !== userId`.
  const auth = await resolveUserId(event);
  if (!auth.ok) {
    event.res.statusCode = auth.status;
    return { error: auth.error };
  }
  const userId = auth.userId;

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch invitations for a board
      const query = getQuery(event);
      const boardId = query.boardId;

      // HIGH FIX: Validate boardId is a positive integer
      if (!boardId || isNaN(Number(boardId)) || Number(boardId) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid board ID" };
      }

      // Check if the board exists
      const [boardRows] = await db.query("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = boardRows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      if (board.user !== userId) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // Fetch invitations for the board with user details
      const [invitationRows] = await db.query(
        `SELECT
          invitations.*,
          user.name AS userName,
          user.image AS userImage
        FROM invitations
        LEFT JOIN user ON invitations.user = user.id
        WHERE invitations.board = ?`,
        [boardId],
      );

      return { invitations: invitationRows };
    } else if (method === "POST") {
      // Handle POST request to create an invitation
      const {
        boardId,
        mail,
        userId: inviteUserId,
        permission,
      } = await readBody(event);

      // HIGH FIX: Validate required fields with generic message.
      // The invitee is identified either by a picked user id (from the
      // directory search) or, for backward compatibility, by email.
      if (!boardId || (!mail && !inviteUserId) || !permission) {
        event.res.statusCode = 400;
        return { error: "Required fields are missing" };
      }

      // HIGH FIX: Validate boardId is a positive integer
      if (isNaN(Number(boardId)) || Number(boardId) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid board ID" };
      }

      // Check if the board exists
      const [boardRows] = await db.query("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = boardRows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Check if the authenticated user is the creator of the board
      if (board.user !== userId) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // Resolve the invited user — by picked id, else by email (legacy).
      const [creatorRows] = inviteUserId
        ? await db.query("SELECT * FROM user WHERE id = ?", [inviteUserId])
        : await db.query("SELECT * FROM user WHERE email = ?", [mail]);
      if (creatorRows.length === 0) {
        // Nobody here holds that address. If the caller gave us one, invite them
        // to the instance: a token goes to the address, and signing up through
        // it creates the account and grants this board. Without an address —
        // i.e. a picked user id that no longer resolves — there is nothing to
        // send, and the response stays the same either way so a board owner
        // still cannot use this to discover which addresses have accounts.
        if (mail) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const address = String(mail).trim().toLowerCase();

          if (emailRegex.test(address)) {
            await inviteByEmail({
              db,
              boardId: Number(boardId),
              board,
              address,
              permission,
              invitedBy: userId,
              appName,
              baseURL,
              language: defaultLanguage,
            });
          }
        }
        return { message: "Invitation created successfully", invitation: null };
      }
      const creatorId = creatorRows[0].id;

      // Check if the user is already invited to the board
      const [existingInvitationRows] = await db.query(
        "SELECT * FROM invitations WHERE board = ? AND user = ?",
        [boardId, creatorId],
      );

      if (existingInvitationRows.length > 0) {
        // HIGH FIX: Generic error
        event.res.statusCode = 400;
        return { error: "Invitation already exists" };
      }
      if (userId === creatorId) {
        // HIGH FIX: Generic error
        event.res.statusCode = 400;
        return { error: "Cannot invite yourself" };
      }
      // Create the invitation
      const [result] = await db.query(
        "INSERT INTO invitations (board, user, permission) VALUES (?, ?, ?)",
        [boardId, creatorId, permission],
      );

      // Email the invited user directly with a link to the board and their
      // access level. Best-effort: a mail hiccup must not fail the invite.
      try {
        const [inviterRows] = await db.query(
          "SELECT name FROM user WHERE id = ?",
          [userId],
        );
        const { subject, html } = getBoardInviteEmail({
          appName,
          name: creatorRows[0].name,
          inviterName: inviterRows[0]?.name || appName,
          boardName: board.name,
          permission,
          boardURL: `${baseURL}/board/${boardId}`,
          language: defaultLanguage,
        });
        await sendEmail({ to: creatorRows[0].email, subject, text: html });
      } catch (mailError) {
        logger.error("Board invite email failed:", mailError);
      }

      // Fetch the newly created invitation with user details
      const [invitationRows] = await db.query(
        `SELECT
          invitations.*,
          user.name AS userName,
          user.image AS userImage
        FROM invitations
        LEFT JOIN user ON invitations.user = user.id
        WHERE invitations.id = ?`,
        [result.insertId],
      );

      return {
        message: "Invitation created successfully",
        invitation: invitationRows[0],
      };
    } else if (method === "DELETE") {
      // Handle DELETE request to remove an invitation
      const query = getQuery(event);
      const boardId = query.boardId;
      const invitedUserId = query.userId;

      // HIGH FIX: Validate boardId is a positive integer, userId is a valid UUID or integer
      if (
        !boardId ||
        !invitedUserId ||
        isNaN(Number(boardId)) ||
        Number(boardId) <= 0
      ) {
        event.res.statusCode = 400;
        return { error: "Invalid ID values" };
      }

      // Check if the board exists
      const [boardRows] = await db.query("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = boardRows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Check if the authenticated user is the creator of the board
      if (board.user !== userId) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // CRITICAL FIX: Only allow deleting invitations for users who have invitations to this board
      // This prevents deleting arbitrary user IDs
      const [existingInvitationRows] = await db.query(
        "SELECT * FROM invitations WHERE board = ? AND user = ?",
        [boardId, invitedUserId],
      );

      if (existingInvitationRows.length === 0) {
        // HIGH FIX: Generic error to prevent invitation enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Remove the invitation and everything that hung off it (webhook
      // subscriptions, notifications) — see removeBoardMember.
      const removed = await removeBoardMember(db, boardId, invitedUserId);

      if (!removed) {
        // HIGH FIX: Generic error (should not happen due to check above, but kept for safety)
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      return { message: "Invitation removed successfully" };
    } else {
      event.res.statusCode = 405;
      return { error: "Method not allowed" };
    }
  } catch (error) {
    logger.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});

// Invite an address that has no account here yet.
//
// Re-inviting the same address to the same board replaces the outstanding
// invitation rather than accumulating live tokens: the newest link is the only
// one that works, which is what somebody clicking "invite" a second time
// expects — they think they are resending it.
//
// Best-effort by design. The board owner has already been told the invitation
// was sent; a mail server that is briefly down should leave a row behind and a
// line in the log, not an error on a screen they can do nothing about.
async function inviteByEmail({
  db,
  boardId,
  board,
  address,
  permission,
  invitedBy,
  appName,
  baseURL,
  language,
}: {
  db: any;
  boardId: number;
  board: any;
  address: string;
  permission: string;
  invitedBy: string;
  appName: string;
  baseURL: string;
  language: string;
}) {
  const token = createInviteToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  try {
    await db.execute(
      "DELETE FROM `board_email_invites` WHERE `board` = ? AND `email` = ? AND `usedAt` IS NULL",
      [boardId, address],
    );
    await db.execute(
      "INSERT INTO `board_email_invites` (`board`, `email`, `permission`, `tokenHash`, `invitedBy`, `expiresAt`) VALUES (?, ?, ?, ?, ?, ?)",
      [
        boardId,
        address,
        permission === "edit" ? "edit" : "read",
        hashInviteToken(token),
        invitedBy,
        expiresAt,
      ],
    );
  } catch (error) {
    logger.error("Email invitation could not be stored:", error);
    return;
  }

  try {
    const [inviterRows] = await db.query("SELECT name FROM user WHERE id = ?", [
      invitedBy,
    ]);
    const { subject, html } = getBoardInviteSignupEmail({
      appName,
      inviterName: inviterRows[0]?.name || appName,
      boardName: board.name,
      permission,
      signupURL: `${baseURL}/sign-up/?invite=${token}`,
      language,
    });
    await sendEmail({ to: address, subject, text: html });
  } catch (mailError) {
    logger.error("Email invitation could not be sent:", mailError);
  }
}
