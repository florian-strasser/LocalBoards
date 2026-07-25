/**
 * Remove a collaborator from a board and clean up everything that hung off that
 * membership. Shared by the two paths that can end it — the owner revoking an
 * invitation and the member leaving on their own — so the cleanup can never
 * drift apart between them.
 *
 * Returns false when the user had no invitation to begin with.
 */
export async function removeBoardMember(
  db: any,
  boardId: number | string,
  memberId: string,
): Promise<boolean> {
  const [result]: any = await db.execute(
    "DELETE FROM invitations WHERE board = ? AND user = ?",
    [boardId, memberId],
  );
  if (!result.affectedRows) return false;

  // Their webhook subscriptions for this board must stop firing: access is
  // gone, so the deliveries would leak card and comment content.
  await db.execute("DELETE FROM `webhooks` WHERE board = ? AND user = ?", [
    boardId,
    memberId,
  ]);

  // Notifications about a board they can no longer open are just dead links.
  await db.execute(
    "DELETE FROM `notifications` WHERE boardId = ? AND userId = ?",
    [boardId, memberId],
  );

  // Their dashboard placement for this board is gone too, so it doesn't linger
  // in a group after they lose access.
  await db.execute(
    "DELETE FROM `board_placements` WHERE board = ? AND `user` = ?",
    [boardId, memberId],
  );

  return true;
}
