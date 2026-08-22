import { getBoardMemberIds } from "./boardMembers";
import { getServerSocket } from "./socket";

// A board's tile on the dashboard carries its name, its colour or image, and
// the faces of the people on it. Any of those can be changed by somebody else —
// from their own dashboard, from the board itself, or by an API client — and
// until now the realtime events only ever reached the board's own room, so a
// dashboard sat on stale tiles until it was reloaded.
//
// This is called from the endpoints that change those things rather than from
// the browser that asked for the change: the endpoint is the one place every
// route in goes through, and it is the only one that can still read who the
// members were just before a board is deleted.
//
// `memberIds` is for exactly that case — read them first, delete, then notify.
export async function notifyDashboards(
  db: any,
  boardId: number | string,
  memberIds?: string[],
): Promise<void> {
  const id = Number(boardId);
  if (!Number.isInteger(id) || id <= 0) return;
  try {
    const ids = memberIds ?? (await getBoardMemberIds(db, id));
    if (!ids.length) return;
    const io = getServerSocket();
    for (const userId of ids) {
      io.to(`dashboard-${userId}`).emit("dashboardChanged", { boardID: id });
    }
  } catch (err) {
    // A dashboard that misses a signal is one reload behind; it is never worth
    // failing the request that caused it.
    logger.error("Dashboard notification failed:", err);
  }
}

// The same change, told to anyone with the board itself open, so its member
// list and avatars follow without a reload.
export async function notifyBoardMembersChanged(
  boardId: number | string,
): Promise<void> {
  const id = Number(boardId);
  if (!Number.isInteger(id) || id <= 0) return;
  try {
    getServerSocket().to(`board-${id}`).emit("boardMembersUpdated", { boardID: id });
  } catch (err) {
    logger.error("Board member notification failed:", err);
  }
}
