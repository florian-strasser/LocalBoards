import { defineEventHandler, readBody } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { removeBoardMember } from "../../utils/boardMembership";

// POST /api/data/leaveBoard  { boardId }
//
// Lets a collaborator remove themselves from a board they were invited to.
// An invitation grants access immediately and there is no accept step, so this
// is the only way out for someone who no longer wants a board on their
// dashboard. The owner is deliberately excluded: a board always has exactly one
// owner, so "leaving" it would orphan it — the owner deletes the board instead.
export default defineEventHandler(async (event) => {
  if (event.req.method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  const auth = await resolveUserId(event);
  if (!auth.ok) {
    event.res.statusCode = auth.status;
    return { error: auth.error };
  }
  const userId = auth.userId;

  const body = await readBody(event).catch(() => null);
  const boardId = body?.boardId;
  if (!boardId || isNaN(Number(boardId)) || Number(boardId) <= 0) {
    event.res.statusCode = 400;
    return { error: "Invalid board id" };
  }

  try {
    const db = setupDatabase();
    const [[board]]: any = await db.query(
      "SELECT id, user FROM boards WHERE id = ?",
      [boardId],
    );
    // Same 404 as "no membership" so board ids can't be probed.
    if (!board) {
      event.res.statusCode = 404;
      return { error: "Resource not found" };
    }

    if (board.user === userId) {
      event.res.statusCode = 400;
      return { error: "OWNER_CANNOT_LEAVE" };
    }

    const removed = await removeBoardMember(db, board.id, userId);
    if (!removed) {
      event.res.statusCode = 404;
      return { error: "Resource not found" };
    }

    return { message: "Left board successfully" };
  } catch (error) {
    logger.error("Leave board error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
