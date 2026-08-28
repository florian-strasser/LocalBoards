import { describe, it, expect } from "vitest";
import {
  requireId,
  serializeBoard,
  serializeArea,
  serializeCard,
  McpError,
} from "../server/utils/mcpHelpers";

describe("requireId", () => {
  it("prefers the primary value, falls back to the deprecated alias", () => {
    expect(requireId(5, undefined, "cardId")).toBe(5);
    expect(requireId(undefined, 7, "cardId")).toBe(7);
    expect(requireId(5, 7, "cardId")).toBe(5);
  });

  it("throws a VALIDATION McpError when neither is provided", () => {
    try {
      requireId(undefined, undefined, "cardId");
      throw new Error("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(McpError);
      expect(e.code).toBe("VALIDATION");
      expect(e.message).toBe("VALIDATION: cardId is required.");
    }
  });
});

describe("serializeCard", () => {
  it("normalizes status to a boolean, dates to ISO, and includes counts when present", () => {
    const c = serializeCard({
      id: 1,
      area: 2,
      name: "C",
      content: "# md",
      status: 1,
      dueDate: "2026-08-01T09:00:00Z",
      assignee: "u-ben",
      sort: 3,
      commentCount: 2,
      attachmentCount: 0,
    });
    expect(c).toMatchObject({
      id: 1,
      areaId: 2,
      name: "C",
      content: "# md",
      done: true,
      assigneeId: "u-ben",
      position: 3,
      commentCount: 2,
      attachmentCount: 0,
    });
    expect(c.dueDate).toBe("2026-08-01T09:00:00.000Z");
  });

  it("handles nulls and omits counts when absent", () => {
    const c = serializeCard({
      id: 1,
      area: 2,
      name: "C",
      content: null,
      status: 0,
      dueDate: null,
      assignee: null,
      sort: 0,
    });
    expect(c.done).toBe(false);
    expect(c.dueDate).toBeNull();
    expect(c.assigneeId).toBeNull();
    expect(c.content).toBe("");
    expect("commentCount" in c).toBe(false);
    expect("attachmentCount" in c).toBe(false);
  });
});

describe("serializeBoard / serializeArea", () => {
  it("shapes a board", () => {
    expect(
      serializeBoard({
        id: 1,
        name: "B",
        style: "kanban",
        status: "public",
        image: "/images/board_placeholder_01.webp",
        color: "#2563eb",
        user: "u1",
      }),
    ).toEqual({
      id: 1,
      name: "B",
      style: "kanban",
      status: "public",
      image: "/images/board_placeholder_01.webp",
      color: "#2563eb",
      ownerId: "u1",
    });
  });
  it("defaults board style/status", () => {
    const b = serializeBoard({ id: 1, name: "B", user: "u1" });
    expect(b.style).toBe("kanban");
    expect(b.status).toBe("private");
    // A board with no appearance set reports both as null rather than omitting
    // them, so a client can tell "default" from "not supported".
    expect(b.image).toBeNull();
    expect(b.color).toBeNull();
  });
  it("shapes an area", () => {
    expect(serializeArea({ id: 3, board: 1, name: "Backlog", sort: 0 })).toEqual({
      id: 3,
      boardId: 1,
      name: "Backlog",
      position: 0,
    });
  });
});
