import { describe, it, expect } from "vitest";
import { getBoardInviteEmail } from "../server/utils/translations";

describe("getBoardInviteEmail", () => {
  it("links the board and describes read & write access", () => {
    const { subject, html } = getBoardInviteEmail({
      appName: "LocalBoards",
      name: "Alice",
      inviterName: "Bob",
      boardName: "Roadmap",
      permission: "edit",
      boardURL: "https://boards.example.com/board/7",
      language: "en",
    });
    expect(subject).toBe("You've been invited to a board | LocalBoards");
    expect(html).toContain("Bob");
    expect(html).toContain("Roadmap");
    expect(html).toContain("read &amp; write");
    expect(html).toContain(
      '<a href="https://boards.example.com/board/7">https://boards.example.com/board/7</a>',
    );
  });

  it("describes read-only access for a read permission", () => {
    const { html } = getBoardInviteEmail({
      appName: "LocalBoards",
      name: "Alice",
      inviterName: "Bob",
      boardName: "Roadmap",
      permission: "read",
      boardURL: "https://x/board/1",
      language: "en",
    });
    expect(html).toContain("read-only");
    expect(html).not.toContain("read &amp; write");
  });

  it("translates (de) and escapes HTML in the board name", () => {
    const { subject, html } = getBoardInviteEmail({
      appName: "LocalBoards",
      name: "Alice",
      inviterName: "Bob",
      boardName: "<b>x</b>",
      permission: "edit",
      boardURL: "https://x/board/1",
      language: "de",
    });
    expect(subject).toBe(
      "Du wurdest zu einem Board eingeladen | LocalBoards",
    );
    expect(html).toContain("Lesen &amp; Schreiben");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
