// Centralized board access-control decision.
//
// The same rule was previously re-implemented inline in every data endpoint
// (board.ts, area.ts, card.ts, comment.ts, …). Extracting it into one pure,
// dependency-free function means the security-critical logic can be unit-tested
// exhaustively and lives in a single place, so it can no longer drift between
// endpoints.
//
// This function only *decides* access from already-loaded data; callers remain
// responsible for loading the board row and the user's invitation (if any) and
// for turning the result into an HTTP response.

export type BoardAccess = "none" | "read" | "edit";

export interface BoardAccessBoard {
  // The board owner's user id (varchar userId in the DB).
  user: string | number | null;
  // "private" | "public" (other values are treated as non-private).
  status: string | null;
}

export interface BoardInvitation {
  // "edit" grants write access; anything else (e.g. "view") grants read.
  permission: string | null;
}

/**
 * Resolve the access level a user has on a board.
 *
 * Mirrors the existing endpoint logic exactly:
 *  - The owner always has full ("edit") access.
 *  - A private board is only reachable through an invitation; the invitation's
 *    permission decides edit vs. read. No invitation means no access.
 *  - A public board currently grants write ("edit") access to everyone.
 *  - Any other (non-private) status is read-only for non-owners.
 *
 * @param board       The board row ({ user, status }).
 * @param userId      The authenticated user's id (or null/undefined).
 * @param invitation  The user's invitation to this board, if any.
 */
export function resolveBoardAccess(
  board: BoardAccessBoard,
  userId: string | number | null | undefined,
  invitation?: BoardInvitation | null,
): BoardAccess {
  // The board owner always has full access. Guard against a falsy userId so an
  // unauthenticated caller is never mistaken for an owner (e.g. null === null).
  if (userId && board.user === userId) {
    return "edit";
  }

  // Private boards are only reachable through an invitation.
  if (board.status === "private") {
    if (!invitation) return "none";
    return invitation.permission === "edit" ? "edit" : "read";
  }

  // Public boards currently grant write access to everyone; any other
  // (non-private) status is read-only for non-owners.
  return board.status === "public" ? "edit" : "read";
}
