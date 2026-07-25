import { defineEventHandler, readBody } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import {
  accessibleBoardIds,
  ownGroupIds,
} from "../../utils/dashboardArrangement";

// Persist the caller's whole dashboard arrangement in one call. The client sends
// the full picture after any drag, and this upserts it idempotently:
//
//   { placements: [{ boardId, groupId|null, sort }], groupOrder?: [groupId, …] }
//
// Every boardId must be one the caller can access, and every groupId one of the
// caller's own groups — anything else is rejected, so the arrangement can never
// reference another user's boards or groups.
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
  const db = setupDatabase();

  const body = await readBody(event).catch(() => null);
  if (!body || typeof body !== "object") {
    event.res.statusCode = 400;
    return { error: "INVALID_BODY" };
  }

  const placements = Array.isArray(body.placements) ? body.placements : [];
  const groupOrder = Array.isArray(body.groupOrder) ? body.groupOrder : null;

  try {
    const [allowedBoards, allowedGroups] = await Promise.all([
      accessibleBoardIds(db, userId),
      ownGroupIds(db, userId),
    ]);

    // Validate before writing anything, so one bad entry rejects the whole
    // request rather than leaving a half-applied arrangement.
    for (const p of placements) {
      const boardId = Number(p?.boardId);
      if (!allowedBoards.has(boardId)) {
        event.res.statusCode = 403;
        return { error: "FORBIDDEN_BOARD", boardId: p?.boardId };
      }
      if (p.groupId !== null && p.groupId !== undefined) {
        if (!allowedGroups.has(Number(p.groupId))) {
          event.res.statusCode = 403;
          return { error: "FORBIDDEN_GROUP", groupId: p.groupId };
        }
      }
    }
    if (groupOrder) {
      for (const gid of groupOrder) {
        if (!allowedGroups.has(Number(gid))) {
          event.res.statusCode = 403;
          return { error: "FORBIDDEN_GROUP", groupId: gid };
        }
      }
    }

    // Upsert placements. The unique (user, board) key makes this idempotent —
    // re-sending the same arrangement is a no-op.
    for (const p of placements) {
      const boardId = Number(p.boardId);
      const groupId =
        p.groupId === null || p.groupId === undefined ? null : Number(p.groupId);
      const sort = Number.isFinite(Number(p.sort)) ? Number(p.sort) : 0;
      await db.execute(
        `INSERT INTO \`board_placements\` (\`user\`, \`board\`, \`group\`, \`sort\`)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`group\` = VALUES(\`group\`), \`sort\` = VALUES(\`sort\`)`,
        [userId, boardId, groupId, sort],
      );
    }

    // Reorder the caller's groups to match the given order.
    if (groupOrder) {
      for (let i = 0; i < groupOrder.length; i++) {
        await db.execute(
          "UPDATE `board_groups` SET sort = ? WHERE id = ? AND `user` = ?",
          [i, Number(groupOrder[i]), userId],
        );
      }
    }

    return { ok: true };
  } catch (error) {
    logger.error("Board arrangement error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
