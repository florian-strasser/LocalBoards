import { defineEventHandler, readBody, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { sendEmail } from "../../../app/lib/sendEmail";
import { getBoardInviteEmail } from "../../utils/translations";

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
        // Do NOT reveal whether an account exists for this email address
        // (prevents email enumeration by a board owner). Return the same generic
        // success shape as a real invite — no invitation is created, and the UI
        // only adds a row when `invitation` is present.
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
