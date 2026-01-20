import { defineEventHandler, readBody, getQuery } from "h3";
import { auth } from "~/lib/auth";
import { setupDatabase } from "../../../app/lib/databaseSetup";

const appName = process.env.APP_NAME || "LocalBoards";
const baseURL = process.env.PUBLIC_URL || "https://boards.florian-strasser.de";

const buildTitle = (title) => {
  return title + " | " + appName;
};

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  // Extract API key from headers
  const apiKey = event.headers.get("x-api-key");

  // Validate API key if provided
  let userIdFromApiKey = null;
  if (apiKey) {
    const data = await auth.api.verifyApiKey({
      body: {
        key: apiKey,
      },
    });

    if (data.error) {
      event.res.statusCode = 403;
      return { error: "Unauthorized access" };
    } else {
      userIdFromApiKey = data.key.userId;
    }
  }

  const session = await auth.api.getSession({
    headers: event.headers,
  });

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch invitations for a board
      const query = getQuery(event);
      const boardId = query.boardId;

      if (!boardId) {
        event.res.statusCode = 400;
        return { error: "Board ID is required" };
      }

      // Check if the board exists
      const [boardRows] = await db.query("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = boardRows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      if (board.user !== userIdFromApiKey && board.user !== session.user.id) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // Check if the user is the creator of the board
      const userId = query.userId;

      if (board.user !== userId) {
        event.res.statusCode = 403;
        return {
          error: "Unauthorized access",
        };
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
      const { boardId, userId, mail, permission } = await readBody(event);

      if (!boardId || !userId || !mail || !permission) {
        event.res.statusCode = 400;
        return { error: "Board ID, userId, mail and permission are required" };
      }

      // Check if the board exists
      const [boardRows] = await db.query("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = boardRows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      // Check if the user is the creator of the board
      if (board.user !== userIdFromApiKey && board.user !== session.user.id) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // Determine User ID by mail
      const [creatorRows] = await db.query(
        "SELECT * FROM user WHERE email = ?",
        [mail],
      );
      if (creatorRows.length === 0) {
        return {
          error: "User does not exist yet",
        };
      }
      const creatorId = creatorRows[0].id;

      // Check if the user is already invited to the board
      const [existingInvitationRows] = await db.query(
        "SELECT * FROM invitations WHERE board = ? AND user = ?",
        [boardId, creatorId],
      );

      if (existingInvitationRows.length > 0) {
        return { error: "User is already invited to this board" };
      }
      if (userId === creatorId) {
        return { error: "You can't invite yourself" };
      }
      // Create the invitation
      const [result] = await db.query(
        "INSERT INTO invitations (board, user, permission) VALUES (?, ?, ?)",
        [boardId, creatorId, permission],
      );

      // Create a notification for the invited user
      await db.query(
        "INSERT INTO notifications (userId, type, boardId, message) VALUES (?, ?, ?, ?)",
        [
          creatorId,
          "invitation",
          boardId,
          `You have been invited to the board: ${board.name}`,
        ],
      );

      return { message: "Invitation created successfully" };
    } else if (method === "DELETE") {
      // Handle DELETE request to remove an invitation
      const query = getQuery(event);
      const boardId = query.boardId;
      const userId = query.userId;
      const deleteUser = query.deleteUser;

      if (!boardId || !userId) {
        event.res.statusCode = 400;
        return { error: "Board ID and user ID are required" };
      }

      // Check if the board exists
      const [boardRows] = await db.query("SELECT * FROM boards WHERE id = ?", [
        boardId,
      ]);
      const board = boardRows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Board not found" };
      }

      // Check if the user is the creator of the board
      if (board.user !== userIdFromApiKey && board.user !== session.user.id) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // Remove the invitation
      const [result] = await db.query(
        "DELETE FROM invitations WHERE board = ? AND user = ?",
        [boardId, deleteUser],
      );

      if (result.affectedRows === 0) {
        event.res.statusCode = 404;
        return { error: "Invitation not found" };
      }

      return { message: "Invitation removed successfully" };
    } else {
      event.res.statusCode = 405;
      return { error: "Method not allowed" };
    }
  } catch (error) {
    console.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
