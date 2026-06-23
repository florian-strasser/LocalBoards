import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db, migrate, resetData } from "./db";
import { authorizeBoard } from "../../server/utils/auth";

beforeAll(async () => {
  await migrate();
});
beforeEach(async () => {
  await resetData();
});

async function insertBoard(id: number, user: string, status: string) {
  await db().execute(
    "INSERT INTO `boards` (`id`,`user`,`name`,`status`) VALUES (?,?,?,?)",
    [id, user, "Board", status],
  );
  return { id, user, status };
}

async function invite(board: number, user: string, permission: string) {
  await db().execute(
    "INSERT INTO `invitations` (`board`,`user`,`permission`) VALUES (?,?,?)",
    [board, user, permission],
  );
}

describe("authorizeBoard (integration, real MySQL)", () => {
  it("grants the owner edit (no invitation lookup needed)", async () => {
    const board = await insertBoard(1, "owner", "private");
    const res = await authorizeBoard(db(), board, "owner", "edit");
    expect(res).toMatchObject({ ok: true, access: "edit" });
  });

  it("reads an 'edit' invitation from the DB and grants edit", async () => {
    const board = await insertBoard(1, "owner", "private");
    await invite(1, "bob", "edit");
    const res = await authorizeBoard(db(), board, "bob", "edit");
    expect(res).toMatchObject({ ok: true, access: "edit" });
  });

  it("grants read but not edit for a 'read' invitation", async () => {
    const board = await insertBoard(1, "owner", "private");
    await invite(1, "viewer", "read");
    expect(
      await authorizeBoard(db(), board, "viewer", "read"),
    ).toMatchObject({ ok: true, access: "read" });
    expect(
      await authorizeBoard(db(), board, "viewer", "edit"),
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("denies a private-board non-owner with no invitation", async () => {
    const board = await insertBoard(1, "owner", "private");
    const res = await authorizeBoard(db(), board, "stranger", "read");
    expect(res).toMatchObject({ ok: false, status: 403 });
  });

  it("grants read to anyone on a public board", async () => {
    const board = await insertBoard(1, "owner", "public");
    const res = await authorizeBoard(db(), board, "stranger", "read");
    expect(res).toMatchObject({ ok: true, access: "read" });
  });

  it("denies edit to an uninvited user on a public board", async () => {
    const board = await insertBoard(1, "owner", "public");
    const res = await authorizeBoard(db(), board, "stranger", "edit");
    expect(res).toMatchObject({ ok: false, status: 403 });
  });

  it("grants edit on a public board only with an edit invitation", async () => {
    const board = await insertBoard(1, "owner", "public");
    await invite(1, "bob", "edit");
    const res = await authorizeBoard(db(), board, "bob", "edit");
    expect(res).toMatchObject({ ok: true, access: "edit" });
  });
});
