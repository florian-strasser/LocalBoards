import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db, migrate, resetData, insertUser } from "./db";
import { fakeEvent } from "./event";
import { requireBoardAccess } from "../../server/utils/auth";
import { hashApiKey } from "../../server/utils/apiKey";

beforeAll(async () => {
  await migrate();
});
beforeEach(async () => {
  await resetData();
});

// Seed an API key for a user and return the plaintext to send in the header.
async function createApiKey(userId: string, plain: string) {
  await db().execute(
    "INSERT INTO `apikey` (`id`,`name`,`start`,`key`,`referenceId`) VALUES (?,?,?,?,?)",
    [`key-${userId}`, "test", plain.substring(0, 8), hashApiKey(plain), userId],
  );
  return plain;
}

async function insertBoard(id: number, user: string, status: string) {
  await db().execute(
    "INSERT INTO `boards` (`id`,`user`,`name`,`status`) VALUES (?,?,?,?)",
    [id, user, "Board", status],
  );
}

async function invite(board: number, user: string, permission: string) {
  await db().execute(
    "INSERT INTO `invitations` (`board`,`user`,`permission`) VALUES (?,?,?)",
    [board, user, permission],
  );
}

const eventForKey = (key: string) => fakeEvent({ headers: { "x-api-key": key } });

describe("requireBoardAccess (integration, real MySQL, API-key auth)", () => {
  it("grants the owner edit access", async () => {
    await insertUser("owner");
    const key = await createApiKey("owner", "ownerkey0000000000000000000000aa");
    await insertBoard(1, "owner", "private");

    const res = await requireBoardAccess(eventForKey(key), 1, "read");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.userId).toBe("owner");
      expect(res.viaApiKey).toBe(true);
      expect(res.access).toBe("edit");
    }
  });

  it("denies a non-owner on a private board with no invitation", async () => {
    await insertUser("owner");
    await insertUser("bob");
    const key = await createApiKey("bob", "bobkey000000000000000000000000aa");
    await insertBoard(1, "owner", "private");

    const res = await requireBoardAccess(eventForKey(key), 1, "read");
    expect(res).toMatchObject({ ok: false, status: 403 });
  });

  it("grants a non-owner with an 'edit' invitation edit access", async () => {
    await insertUser("owner");
    await insertUser("bob");
    const key = await createApiKey("bob", "bobkey111111111111111111111111aa");
    await insertBoard(1, "owner", "private");
    await invite(1, "bob", "edit");

    const res = await requireBoardAccess(eventForKey(key), 1, "edit");
    expect(res).toMatchObject({ ok: true, access: "edit" });
  });

  it("gives a 'read' invitation read but not edit", async () => {
    await insertUser("owner");
    await insertUser("viewer");
    const key = await createApiKey("viewer", "viewerkey00000000000000000000aaa");
    await insertBoard(1, "owner", "private");
    await invite(1, "viewer", "read");

    expect(
      await requireBoardAccess(eventForKey(key), 1, "read"),
    ).toMatchObject({ ok: true, access: "read" });
    expect(
      await requireBoardAccess(eventForKey(key), 1, "edit"),
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("lets a stranger read a public board but not edit it", async () => {
    await insertUser("owner");
    await insertUser("stranger");
    const key = await createApiKey("stranger", "strangerkey0000000000000000000aa");
    await insertBoard(1, "owner", "public");

    expect(
      await requireBoardAccess(eventForKey(key), 1, "read"),
    ).toMatchObject({ ok: true, access: "read" });
    expect(
      await requireBoardAccess(eventForKey(key), 1, "edit"),
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("returns 404 for a missing board", async () => {
    await insertUser("owner");
    const key = await createApiKey("owner", "ownerkey2222222222222222222222aa");

    const res = await requireBoardAccess(eventForKey(key), 999, "read");
    expect(res).toMatchObject({ ok: false, status: 404 });
  });

  it("returns 400 for an invalid board id", async () => {
    await insertUser("owner");
    const key = await createApiKey("owner", "ownerkey3333333333333333333333aa");

    const res = await requireBoardAccess(eventForKey(key), "abc", "read");
    expect(res).toMatchObject({ ok: false, status: 400 });
  });

  it("denies an unauthenticated request (no API key, no session)", async () => {
    await insertUser("owner");
    await insertBoard(1, "owner", "private");

    const res = await requireBoardAccess(fakeEvent(), 1, "read");
    expect(res).toMatchObject({ ok: false, status: 403 });
  });

  it("denies a request with an invalid API key", async () => {
    await insertUser("owner");
    await insertBoard(1, "owner", "private");

    const res = await requireBoardAccess(
      eventForKey("totallyinvalidkey0000000000000aa"),
      1,
      "read",
    );
    expect(res).toMatchObject({ ok: false, status: 403 });
  });
});
