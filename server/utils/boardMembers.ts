// Everyone with access to a board: the owner plus all invited users.
// Used for due-date reminders (unassigned cards notify all members) and for the
// assignee picker.

export async function getBoardMemberIds(
  db: any,
  boardId: number | string,
): Promise<string[]> {
  const [ownerRows]: any = await db.execute(
    "SELECT `user` FROM boards WHERE id = ?",
    [boardId],
  );
  const [inviteRows]: any = await db.execute(
    "SELECT `user` FROM invitations WHERE board = ?",
    [boardId],
  );

  const ids = new Set<string>();
  const owner = ownerRows[0]?.user;
  if (owner) ids.add(owner);
  for (const row of inviteRows as any[]) {
    if (row.user) ids.add(row.user);
  }
  return [...ids];
}
