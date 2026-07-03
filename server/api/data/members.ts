import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { getBoardMemberIds } from "../../utils/boardMembers";

// GET /api/data/members?boardId=123
// Returns the board's members (owner + invited users) for the assignee picker.
// Any user with read access to the board may list them.
export default defineEventHandler(async (event) => {
  if (event.req.method !== "GET") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  const boardId = getQuery(event).boardId;

  const auth = await requireBoardAccess(event, boardId, "read");
  if (!auth.ok) {
    event.res.statusCode = auth.status;
    return { error: auth.error };
  }

  try {
    const db = setupDatabase();
    // getBoardMemberIds uses separate queries, avoiding cross-collation column
    // comparisons (boards.user is utf8mb4_general_ci, user.id is 0900_ai_ci).
    const ids = await getBoardMemberIds(db, boardId);
    if (ids.length === 0) return { members: [] };

    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await db.execute(
      `SELECT id, name, image FROM user WHERE id IN (${placeholders})`,
      ids,
    );

    return { members: rows };
  } catch (error) {
    logger.error("List members error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
