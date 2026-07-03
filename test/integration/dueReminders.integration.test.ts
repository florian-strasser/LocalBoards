import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db, migrate, resetData, insertUser } from "./db";
import { runDueReminders } from "../../server/utils/dueReminders";

beforeAll(async () => {
  await migrate();
});
beforeEach(async () => {
  await resetData();
});

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

async function insertBoard(id: number, user: string) {
  await db().execute(
    "INSERT INTO boards (id, user, name, status) VALUES (?,?,?,?)",
    [id, user, "Board", "private"],
  );
}
async function invite(board: number, user: string) {
  await db().execute(
    "INSERT INTO invitations (board, user, permission) VALUES (?,?,?)",
    [board, user, "edit"],
  );
}
async function insertArea(id: number, board: number) {
  await db().execute(
    "INSERT INTO areas (id, board, name, sort) VALUES (?,?,?,?)",
    [id, board, "Area", 0],
  );
}
async function insertCard(
  id: number,
  area: number,
  dueDate: Date,
  assignee: string | null,
) {
  await db().execute(
    "INSERT INTO cards (id, area, name, dueDate, assignee) VALUES (?,?,?,?,?)",
    [id, area, "Task", dueDate, assignee],
  );
}
async function addReminder(card: number, minutesBefore: number) {
  await db().execute(
    "INSERT INTO card_reminders (card, minutesBefore, notified) VALUES (?,?,0)",
    [card, minutesBefore],
  );
}
async function dueRecipients(cardId: number): Promise<string[]> {
  const [rows]: any = await db().execute(
    "SELECT userId FROM notifications WHERE type = 'card_due' AND cardId = ?",
    [cardId],
  );
  return (rows as any[]).map((r) => r.userId).sort();
}

describe("runDueReminders (integration, real MySQL)", () => {
  it("notifies all board members for an unassigned card and doesn't fire twice", async () => {
    await insertUser("owner");
    await insertUser("bob");
    await insertBoard(1, "owner");
    await invite(1, "bob");
    await insertArea(1, 1);
    // Due in 10 min, reminder 30 min before → fire time already passed.
    await insertCard(1, 1, new Date(Date.now() + 10 * MIN), null);
    await addReminder(1, 30);

    expect(await runDueReminders(db())).toBe(1);
    expect(await dueRecipients(1)).toEqual(["bob", "owner"]);

    // The reminder is marked notified, so a second run does nothing.
    expect(await runDueReminders(db())).toBe(0);
    expect((await dueRecipients(1)).length).toBe(2);
  });

  it("notifies only the assignee for an assigned card", async () => {
    await insertUser("owner");
    await insertUser("bob");
    await insertUser("carol");
    await insertBoard(1, "owner");
    await invite(1, "bob");
    await insertArea(1, 1);
    await insertCard(1, 1, new Date(Date.now() + 10 * MIN), "carol");
    await addReminder(1, 30);

    await runDueReminders(db());
    expect(await dueRecipients(1)).toEqual(["carol"]);
  });

  it("does not fire a reminder whose time hasn't arrived yet", async () => {
    await insertUser("owner");
    await insertBoard(1, "owner");
    await insertArea(1, 1);
    // Due in 2 days; a 30-min-before reminder fires only ~2 days from now.
    await insertCard(1, 1, new Date(Date.now() + 2 * DAY), null);
    await addReminder(1, 30);

    expect(await runDueReminders(db())).toBe(0);
    expect(await dueRecipients(1)).toEqual([]);
  });
});
