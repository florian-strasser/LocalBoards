import { defineEventHandler, readBody, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getServerSocket } from "../../utils/socket";

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  // Extract API key from headers
  const apiKey = event.headers.get("x-api-key");

  // Validate API key if provided
  let userIdFromApiKey = null;
  if (apiKey) {
    const data = await verifyApiKey(apiKey);

    if (data.error) {
      event.res.statusCode = 403;
      return { error: "Unauthorized access" };
    } else {
      userIdFromApiKey = data.key.userId;
    }
  }

  const session = await getSession(event);

  // CRITICAL FIX: Early auth check - block unauthenticated access
  if (!userIdFromApiKey && !session) {
    event.res.statusCode = 403;
    return { error: "Unauthorized access" };
  }

  // CRITICAL FIX: Use authenticated userId consistently
  const userId = userIdFromApiKey || session?.user.id;

  // CRITICAL FIX: Ensure userId is defined (defense in depth)
  if (!userId) {
    event.res.statusCode = 403;
    return { error: "Unauthorized access" };
  }

  try {
    // Initialize database
    const db = setupDatabase();

    if (method === "GET") {
      // Handle GET request to fetch comments for a card
      const { cardID } = getQuery(event);

      // HIGH FIX: Validate cardID is a positive integer
      if (!cardID || isNaN(Number(cardID)) || Number(cardID) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid card ID" };
      }

      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        cardID,
      ]);
      const card = rows[0];

      if (!card) {
        // HIGH FIX: Generic error to prevent card enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      let readAccess = false;
      if (board.status === "private" && board.user !== userId) {
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length > 0) {
          readAccess = true;
        }
      } else if (board.user === userId) {
        readAccess = true;
      } else if (board.status === "public") {
        readAccess = true;
      }

      if (readAccess) {
        // Fetch comments for the card with user information using a LEFT JOIN
        const [rows] = await db.execute(
          "SELECT comments.id AS id, comments.card AS card, comments.user AS user, user.name AS userName, user.image AS image, comments.content AS content, comments.date AS date FROM comments LEFT JOIN user ON comments.user = user.id WHERE comments.card = ? ORDER BY comments.date DESC",
          [cardID],
        );
        const comments = rows.map((row) => ({
          id: row.id,
          card: row.card,
          user: row.user,
          userImage: row.image,
          userName: row.userName || "Unknown User",
          content: row.content,
          date: row.date,
        }));

        return { comments: comments };
      } else {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }
    } else if (method === "POST") {
      // Handle POST request to create a new comment
      const { card, content } = await readBody(event);

      // HIGH FIX: Validate required fields with generic message
      if (!card || !content) {
        event.res.statusCode = 400;
        return { error: "Required fields are missing" };
      }

      // HIGH FIX: Validate card is a positive integer
      if (isNaN(Number(card)) || Number(card) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid card ID" };
      }

      const [rows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        card,
      ]);
      const cardItem = rows[0];

      if (!cardItem) {
        // HIGH FIX: Generic error to prevent card enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [cardItem.area],
      );
      const board = boardRows[0];

      if (!board) {
        // HIGH FIX: Generic error to prevent board enumeration
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      let writeAccess = false;
      if (board.status === "private" && board.user !== userId) {
        // Check if the user has an invitation
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length === 0) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        // Determine write access based on invitation permission
        writeAccess = invitationRows[0].permission === "edit";
      } else if (board.user === userId) {
        // User is the creator of the board, so they have write access
        writeAccess = true;
      } else if (board.status === "public") {
        writeAccess = true;
      }

      if (writeAccess) {
        // CRITICAL FIX: Use authenticated userId instead of body user
        // Create new comment
        const [result] = await db.execute(
          "INSERT INTO comments (card, user, content) VALUES (?, ?, ?)",
          [card, userId, content],
        );

        // Fetch the created comment with user information using a LEFT JOIN
        const [rows] = await db.execute(
          "SELECT comments.*, user.name AS userName, user.image AS userImage FROM comments LEFT JOIN user ON comments.user = user.id WHERE comments.id = ?",
          [result.insertId],
        );
        const comment = rows[0]
          ? {
              id: rows[0].id,
              card: rows[0].card,
              user: rows[0].user,
              userImage: rows[0].userImage,
              userName: rows[0].userName || "Unknown User",
              content: rows[0].content,
              date: rows[0].date,
            }
          : null;

        // Emit socket event for new comment (API calls only)
        if (userIdFromApiKey) {
          const serverSocket = getServerSocket();
          if (serverSocket) {
            serverSocket.to(`card-${card}`).emit("addComment", {
              comment,
              cardID: card,
            });
          }
        }

        // Fetch all users who have access to the board (owner and invited users)
        const [boardRows] = await db.execute(
          "SELECT user, id AS boardId FROM boards WHERE id = (SELECT board FROM areas WHERE id = (SELECT area FROM cards WHERE id = ?))",
          [card],
        );
        const boardOwner = boardRows[0]?.user;
        const boardId = boardRows[0]?.boardId;

        const [invitedUsers] = await db.execute(
          "SELECT user FROM invitations WHERE board = (SELECT board FROM areas WHERE id = (SELECT area FROM cards WHERE id = ?))",
          [card],
        );

        // Create notifications for the board owner and invited users
        const usersToNotify = [
          boardOwner,
          ...invitedUsers.map((inv) => inv.user),
        ].filter(Boolean);

        // Fetch the created comment with user information using a LEFT JOIN
        const [cRows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
          card,
        ]);

        for (const notifyUserId of usersToNotify) {
          if (notifyUserId !== userId) {
            // Don't notify the authenticated user who created the comment
            await db.execute(
              "INSERT INTO notifications (userId, type, boardId, cardId, message) VALUES (?, ?, ?, ?, ?)",
              [
                notifyUserId,
                "comment",
                boardId,
                card,
                `New comment by "${rows[0].userName}" on card "${cRows[0]?.name || "a card"}": ${rows[0].content}`,
              ],
            );
          }
        }

        return { comment };
      } else {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }
    } else if (method === "PATCH") {
      // Handle PATCH request to update checklist state in a comment
      // This allows any user with write access to the board to toggle checkboxes
      const { id, content, cardId } = await readBody(event);

      // Validate required fields
      if (!id || !content || !cardId) {
        event.res.statusCode = 400;
        return { error: "Required fields are missing" };
      }

      // Validate id and cardId are positive integers
      if (
        isNaN(Number(id)) ||
        Number(id) <= 0 ||
        isNaN(Number(cardId)) ||
        Number(cardId) <= 0
      ) {
        event.res.statusCode = 400;
        return { error: "Invalid ID" };
      }

      // Fetch the comment
      const [commentRows] = await db.execute(
        "SELECT c.*, card FROM comments c WHERE c.id = ?",
        [id],
      );
      const comment = commentRows[0];

      if (!comment) {
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Verify comment belongs to the specified card
      if (comment.card !== Number(cardId)) {
        event.res.statusCode = 400;
        return { error: "Comment does not belong to specified card" };
      }

      // Verify card exists
      const [cardRows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        comment.card,
      ]);
      const card = cardRows[0];

      if (!card) {
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Verify board exists and check write access
      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Check write access (same logic as POST method)
      let writeAccess = false;
      if (board.status === "private" && board.user !== userId) {
        // Check if the user has an invitation
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length === 0) {
          event.res.statusCode = 403;
          return { error: "Unauthorized access" };
        }
        // Determine write access based on invitation permission
        writeAccess = invitationRows[0].permission === "edit";
      } else if (board.user === userId) {
        // User is the creator of the board, so they have write access
        writeAccess = true;
      } else if (board.status === "public") {
        writeAccess = true;
      }

      if (!writeAccess) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // Validate that only data-checked attributes have changed
      // The frontend sends only the taskList element, so we need to extract it from the old content
      const oldTaskListMatch = comment.content.match(
        /<ul data-type="taskList"[^>]*>(?:[^<]|<(?!\/ul>))+<\/ul>/,
      );
      const oldTaskList = oldTaskListMatch ? oldTaskListMatch[0] : null;

      if (!oldTaskList) {
        event.res.statusCode = 400;
        return { error: "No task list found in original comment" };
      }

      // Extract checkbox states from both old and new taskList
      const oldCheckboxMatches =
        oldTaskList.match(/data-checked="([^"]*)"/g) || [];
      const newCheckboxMatches = content.match(/data-checked="([^"]*)"/g) || [];

      // Check if the list structure is the same (same number of checkboxes)
      if (oldCheckboxMatches.length !== newCheckboxMatches.length) {
        event.res.statusCode = 400;
        return { error: "Invalid content structure" };
      }

      // Simpler: compare content ignoring only the checked state attributes
      const oldWithoutCheckState = oldTaskList
        .replace(/data-checked="(true|false)"/g, "")
        .replace(/\s*checked="checked"/g, "");
      const newWithoutCheckState = content
        .replace(/data-checked="(true|false)"/g, "")
        .replace(/\s*checked="checked"/g, "");

      // If everything else is identical, only checkbox state changed
      if (oldWithoutCheckState !== newWithoutCheckState) {
        event.res.statusCode = 400;
        return { error: "Only checkbox states can be modified" };
      }

      // Update the comment content
      await db.execute("UPDATE comments SET content = ? WHERE id = ?", [
        content,
        id,
      ]);

      // Fetch the updated comment with user information
      const [rows] = await db.execute(
        "SELECT comments.*, user.name AS userName, user.image AS userImage FROM comments LEFT JOIN user ON comments.user = user.id WHERE comments.id = ?",
        [id],
      );
      const updatedComment = rows[0]
        ? {
            id: rows[0].id,
            card: rows[0].card,
            user: rows[0].user,
            userImage: rows[0].userImage,
            userName: rows[0].userName || "Unknown User",
            content: rows[0].content,
            date: rows[0].date,
          }
        : null;

      // Emit socket event for comment update (API calls only)
      if (userIdFromApiKey) {
        const serverSocket = getServerSocket();
        if (serverSocket) {
          serverSocket.to(`card-${comment.card}`).emit("updateComment", {
            comment: updatedComment,
            cardID: comment.card,
          });
        }
      }

      return { comment: updatedComment };
    } else if (method === "PUT") {
      // Handle PUT request to update a comment by its creator
      const { id, content } = await readBody(event);

      // Validate required fields
      if (!id || !content) {
        event.res.statusCode = 400;
        return { error: "Required fields are missing" };
      }

      // Validate id is a positive integer
      if (isNaN(Number(id)) || Number(id) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid comment ID" };
      }

      // Fetch the comment with card reference
      const [commentRows] = await db.execute(
        "SELECT c.*, card FROM comments c WHERE c.id = ?",
        [id],
      );
      const comment = commentRows[0];

      if (!comment) {
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Verify card exists
      const [cardRows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        comment.card,
      ]);
      const card = cardRows[0];

      if (!card) {
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Verify board exists and check access
      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Check board access
      let hasAccess = false;
      if (board.status === "private" && board.user !== userId) {
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length > 0) {
          hasAccess = true;
        }
      } else if (board.user === userId) {
        hasAccess = true;
      } else if (board.status === "public") {
        hasAccess = true;
      }

      if (!hasAccess) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // Only allow update by the comment creator
      if (comment.user !== userId) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // Update the comment content
      await db.execute("UPDATE comments SET content = ? WHERE id = ?", [
        content,
        id,
      ]);

      // Fetch the updated comment with user information
      const [rows] = await db.execute(
        "SELECT comments.*, user.name AS userName, user.image AS userImage FROM comments LEFT JOIN user ON comments.user = user.id WHERE comments.id = ?",
        [id],
      );
      const updatedComment = rows[0]
        ? {
            id: rows[0].id,
            card: rows[0].card,
            user: rows[0].user,
            userImage: rows[0].userImage,
            userName: rows[0].userName || "Unknown User",
            content: rows[0].content,
            date: rows[0].date,
          }
        : null;

      // Emit socket event for comment update (API calls only)
      if (userIdFromApiKey) {
        const serverSocket = getServerSocket();
        if (serverSocket) {
          serverSocket.to(`card-${comment.card}`).emit("updateComment", {
            comment: updatedComment,
            cardID: comment.card,
          });
        }
      }

      return { comment: updatedComment };
    } else if (method === "DELETE") {
      // Handle DELETE request to remove a comment by its creator
      const { commentId } = getQuery(event);

      // Validate commentId is a positive integer
      if (!commentId || isNaN(Number(commentId)) || Number(commentId) <= 0) {
        event.res.statusCode = 400;
        return { error: "Invalid comment ID" };
      }

      // Fetch the comment with card reference
      const [commentRows] = await db.execute(
        "SELECT c.*, card FROM comments c WHERE c.id = ?",
        [commentId],
      );
      const comment = commentRows[0];

      if (!comment) {
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Verify card exists to prevent orphaned references
      const [cardRows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
        comment.card,
      ]);
      const card = cardRows[0];

      if (!card) {
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Verify board exists and check access (defense in depth)
      const [boardRows] = await db.execute(
        "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
        [card.area],
      );
      const board = boardRows[0];

      if (!board) {
        event.res.statusCode = 404;
        return { error: "Resource not found" };
      }

      // Check board read access (defense in depth - creator should have access)
      let hasAccess = false;
      if (board.status === "private" && board.user !== userId) {
        const [invitationRows] = await db.execute(
          "SELECT permission FROM invitations WHERE board = ? AND user = ?",
          [board.id, userId],
        );

        if (invitationRows.length > 0) {
          hasAccess = true;
        }
      } else if (board.user === userId) {
        hasAccess = true;
      } else if (board.status === "public") {
        hasAccess = true;
      }

      if (!hasAccess) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // Only allow deletion by the comment creator
      if (comment.user !== userId) {
        event.res.statusCode = 403;
        return { error: "Unauthorized access" };
      }

      // Delete the comment
      await db.execute("DELETE FROM comments WHERE id = ?", [commentId]);

      // Emit socket event for comment deletion (API calls only)
      if (userIdFromApiKey) {
        const serverSocket = getServerSocket();
        if (serverSocket) {
          serverSocket.to(`card-${comment.card}`).emit("deleteComment", {
            commentId: Number(commentId),
            cardID: comment.card,
          });
        }
      }

      return { success: true };
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
