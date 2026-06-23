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
 *  - The owner always has full ("edit") access.
 *  - An invitation governs an invited user's access: an `edit` invitation grants
 *    "edit", any other permission grants "read".
 *  - A public board is readable by anyone ("read") but is NOT writable without
 *    an invitation — public status never grants "edit".
 *  - A private board with no invitation grants no access ("none").
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

  // An invitation determines an invited user's access regardless of board
  // visibility.
  if (invitation) {
    return invitation.permission === "edit" ? "edit" : "read";
  }

  // No invitation: public boards are read-only to everyone else; private boards
  // are not accessible at all.
  return board.status === "public" ? "read" : "none";
}
