import { setupDatabase } from "../../app/lib/databaseSetup";

// Helpers for the per-user dashboard arrangement (board groups + placements).
// The arrangement is always keyed on (user, board), so a user can sort and
// group boards shared with them without affecting anyone else.

/**
 * The set of board ids a user may see — boards they own plus boards shared with
 * them. Used to validate that an arrangement only ever references boards the
 * caller actually has access to.
 */
export async function accessibleBoardIds(
  db: any,
  userId: string,
): Promise<Set<number>> {
  const [rows]: any = await db.query(
    `SELECT id FROM boards WHERE user = ?
     UNION
     SELECT board AS id FROM invitations WHERE user = ?`,
    [userId, userId],
  );
  return new Set(rows.map((r: any) => Number(r.id)));
}

/** The ids of the caller's own groups, so placements can't point at someone else's. */
export async function ownGroupIds(
  db: any,
  userId: string,
): Promise<Set<number>> {
  const [rows]: any = await db.query(
    "SELECT id FROM `board_groups` WHERE `user` = ?",
    [userId],
  );
  return new Set(rows.map((r: any) => Number(r.id)));
}

/**
 * Remove a single board from one user's arrangement (used when they leave a
 * board or an invitation is revoked). The board and everyone else's placements
 * are untouched.
 */
export async function dropUserPlacement(
  db: any,
  userId: string,
  boardId: number | string,
) {
  await db.execute(
    "DELETE FROM `board_placements` WHERE `user` = ? AND `board` = ?",
    [userId, boardId],
  );
}

/**
 * Remove a board from every user's arrangement (used when the board itself is
 * deleted). Keeps board_placements from accumulating rows pointing at boards
 * that no longer exist.
 */
export async function dropBoardPlacements(db: any, boardId: number | string) {
  await db.execute("DELETE FROM `board_placements` WHERE `board` = ?", [
    boardId,
  ]);
}

export function getDb() {
  return setupDatabase();
}
