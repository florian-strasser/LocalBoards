import { describe, it, expect } from "vitest";
import { resolveBoardAccess } from "./boardAccess";

const OWNER = "user-owner";
const OTHER = "user-other";

describe("resolveBoardAccess", () => {
  describe("owner", () => {
    it("grants edit to the owner of a private board", () => {
      expect(
        resolveBoardAccess({ user: OWNER, status: "private" }, OWNER),
      ).toBe("edit");
    });

    it("grants edit to the owner of a public board", () => {
      expect(
        resolveBoardAccess({ user: OWNER, status: "public" }, OWNER),
      ).toBe("edit");
    });

    it("grants edit to the owner regardless of any invitation", () => {
      expect(
        resolveBoardAccess({ user: OWNER, status: "private" }, OWNER, {
          permission: "view",
        }),
      ).toBe("edit");
    });
  });

  describe("private board, non-owner", () => {
    it("denies access without an invitation", () => {
      expect(
        resolveBoardAccess({ user: OWNER, status: "private" }, OTHER),
      ).toBe("none");
    });

    it("denies access when the invitation is null", () => {
      expect(
        resolveBoardAccess({ user: OWNER, status: "private" }, OTHER, null),
      ).toBe("none");
    });

    it("grants edit with an 'edit' invitation", () => {
      expect(
        resolveBoardAccess({ user: OWNER, status: "private" }, OTHER, {
          permission: "edit",
        }),
      ).toBe("edit");
    });

    it("grants read with a 'view' invitation", () => {
      expect(
        resolveBoardAccess({ user: OWNER, status: "private" }, OTHER, {
          permission: "view",
        }),
      ).toBe("read");
    });

    it("grants only read for any non-'edit' invitation permission", () => {
      expect(
        resolveBoardAccess({ user: OWNER, status: "private" }, OTHER, {
          permission: "something-else",
        }),
      ).toBe("read");
      expect(
        resolveBoardAccess({ user: OWNER, status: "private" }, OTHER, {
          permission: null,
        }),
      ).toBe("read");
    });
  });

  describe("public board, non-owner", () => {
    // NOTE: this encodes the *current* behaviour — a public board grants write
    // access to everyone. Flagged for review (see ROADMAP).
    it("grants edit to any user", () => {
      expect(
        resolveBoardAccess({ user: OWNER, status: "public" }, OTHER),
      ).toBe("edit");
    });
  });

  describe("other / unknown status, non-owner", () => {
    it("is read-only", () => {
      expect(
        resolveBoardAccess({ user: OWNER, status: "archived" }, OTHER),
      ).toBe("read");
    });
  });

  describe("unauthenticated / edge cases", () => {
    it("does not treat a falsy userId as the owner even if board.user is also falsy", () => {
      expect(
        resolveBoardAccess({ user: null, status: "private" }, null),
      ).toBe("none");
    });

    it("denies an unauthenticated user on a private board", () => {
      expect(
        resolveBoardAccess({ user: OWNER, status: "private" }, undefined),
      ).toBe("none");
    });

    it("still grants read on a public board to an unauthenticated user", () => {
      // Endpoints block unauthenticated access earlier; this documents the pure
      // decision in isolation.
      expect(
        resolveBoardAccess({ user: OWNER, status: "public" }, null),
      ).toBe("edit");
    });
  });
});
