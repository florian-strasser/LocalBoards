import { describe, it, expect, vi, beforeEach } from "vitest";

// auth.ts transitively imports app/lib/databaseSetup, which calls
// useRuntimeConfig() and opens a MySQL pool at module load. Stub it so the
// import is side-effect-free in tests. authorizeBoard takes its `db` as a
// parameter, so it never touches this mock anyway.
vi.mock("../../app/lib/databaseSetup", () => ({
  setupDatabase: vi.fn(),
}));

const { authorizeBoard } = await import("./auth");

const OWNER = "user-owner";
const OTHER = "user-other";

// A fake mysql2 connection whose execute() returns the given invitation rows in
// the [rows] shape the code destructures. Tracks calls so we can assert whether
// an invitation lookup happened.
function makeDb(invitationRows: any[] = []) {
  return {
    execute: vi.fn(async () => [invitationRows]),
  };
}

const privateBoard = { id: 1, user: OWNER, status: "private" };
const publicBoard = { id: 2, user: OWNER, status: "public" };

describe("authorizeBoard", () => {
  let db: ReturnType<typeof makeDb>;
  beforeEach(() => {
    db = makeDb();
  });

  describe("owner", () => {
    it("grants edit without looking up an invitation", async () => {
      const res = await authorizeBoard(db, privateBoard, OWNER, "edit");
      expect(res).toEqual({ ok: true, access: "edit" });
      expect(db.execute).not.toHaveBeenCalled();
    });
  });

  describe("private board, non-owner (standard)", () => {
    it("denies read with no invitation", async () => {
      db = makeDb([]);
      const res = await authorizeBoard(db, privateBoard, OTHER, "read");
      expect(res).toMatchObject({ ok: false, status: 403 });
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it("grants edit with an 'edit' invitation", async () => {
      db = makeDb([{ permission: "edit" }]);
      const res = await authorizeBoard(db, privateBoard, OTHER, "edit");
      expect(res).toEqual({ ok: true, access: "edit" });
    });

    it("grants read (not edit) with a 'view' invitation", async () => {
      db = makeDb([{ permission: "view" }]);
      expect(await authorizeBoard(db, privateBoard, OTHER, "read")).toEqual({
        ok: true,
        access: "read",
      });
    });

    it("denies edit with only a 'view' invitation", async () => {
      db = makeDb([{ permission: "view" }]);
      expect(
        await authorizeBoard(db, privateBoard, OTHER, "edit"),
      ).toMatchObject({ ok: false, status: 403 });
    });
  });

  describe("public board, non-owner", () => {
    it("grants read without an invitation lookup", async () => {
      const res = await authorizeBoard(db, publicBoard, OTHER, "read");
      expect(res).toEqual({ ok: true, access: "read" });
      // Read on a public board is granted regardless, so no lookup is needed.
      expect(db.execute).not.toHaveBeenCalled();
    });

    it("denies edit without an edit invitation (public never grants write)", async () => {
      db = makeDb([]);
      const res = await authorizeBoard(db, publicBoard, OTHER, "edit");
      expect(res).toMatchObject({ ok: false, status: 403 });
      // An "edit" check must look up the invitation even on a public board.
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it("grants edit WITH an edit invitation", async () => {
      db = makeDb([{ permission: "edit" }]);
      expect(await authorizeBoard(db, publicBoard, OTHER, "edit")).toEqual({
        ok: true,
        access: "edit",
      });
    });
  });

  describe("edit checks", () => {
    it("denies a private-board non-owner with only a 'view' invitation", async () => {
      db = makeDb([{ permission: "view" }]);
      expect(
        await authorizeBoard(db, privateBoard, OTHER, "edit"),
      ).toMatchObject({ ok: false, status: 403 });
    });

    it("grants the owner edit without an invitation lookup", async () => {
      const res = await authorizeBoard(db, publicBoard, OWNER, "edit");
      expect(res).toEqual({ ok: true, access: "edit" });
      expect(db.execute).not.toHaveBeenCalled();
    });
  });
});
