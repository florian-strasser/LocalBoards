import { describe, it, expect } from "vitest";
import {
  parseTrelloShortLink,
  descriptionToHtml,
  checklistToHtml,
  linkAttachmentsToHtml,
  trelloJsonToBoard,
} from "../server/utils/trelloImport";

describe("parseTrelloShortLink", () => {
  it("extracts the shortLink from board URLs", () => {
    expect(parseTrelloShortLink("https://trello.com/b/AbCd1234/my-board")).toBe(
      "AbCd1234",
    );
    expect(parseTrelloShortLink("https://trello.com/b/AbCd1234")).toBe(
      "AbCd1234",
    );
    expect(parseTrelloShortLink("trello.com/b/xY9zAAaa.json")).toBe("xY9zAAaa");
  });

  it("rejects non-board / non-trello URLs", () => {
    expect(parseTrelloShortLink("https://trello.com/c/xxxx/1-card")).toBeNull();
    expect(parseTrelloShortLink("https://example.com/b/AbCd1234")).toBeNull();
    expect(parseTrelloShortLink("")).toBeNull();
    // @ts-expect-error deliberately wrong type
    expect(parseTrelloShortLink(null)).toBeNull();
  });
});

describe("descriptionToHtml", () => {
  it("converts common Markdown and escapes HTML", () => {
    const html = descriptionToHtml(
      "Hello **world** and [link](https://x.com)\nsecond\n\n- a\n- b\n\n# Head\n<b>x</b> & y",
    );
    expect(html).toContain("<strong>world</strong>");
    expect(html).toContain(
      '<a href="https://x.com" target="_blank" rel="noopener noreferrer nofollow">link</a>',
    );
    expect(html).toContain("second"); // single newline joined with <br>
    expect(html).toContain("<br>");
    expect(html).toContain("<ul><li><p>a</p></li><li><p>b</p></li></ul>");
    expect(html).toContain("<h1>Head</h1>");
    // raw HTML in the description is escaped, not passed through
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt; &amp; y");
    expect(html).not.toContain("<b>x</b>");
  });

  it("returns empty string for blank input", () => {
    expect(descriptionToHtml("")).toBe("");
    expect(descriptionToHtml("   \n  ")).toBe("");
  });
});

describe("checklistToHtml", () => {
  it("renders a TipTap task list with checked state, ordered by pos", () => {
    const html = checklistToHtml("Todo", [
      { name: "second", state: "incomplete", pos: 2 },
      { name: "first", state: "complete", pos: 1 },
    ]);
    expect(html).toContain("<strong>Todo</strong>");
    expect(html).toContain('data-type="taskList"');
    // ordered by pos: the complete "first" comes before "second"
    expect(html.indexOf("first")).toBeLessThan(html.indexOf("second"));
    expect(html).toContain('data-checked="true"');
    expect(html).toContain('<input type="checkbox" checked>');
    expect(html).toContain('<input type="checkbox">');
  });
});

describe("linkAttachmentsToHtml", () => {
  it("renders only link attachments (uploads are excluded) as links", () => {
    expect(linkAttachmentsToHtml([])).toBe("");
    const html = linkAttachmentsToHtml([
      {
        name: "Blog post",
        url: "https://blog.example.com/x",
        pos: 1,
        isUpload: false,
      },
      {
        name: "photo.png",
        url: "https://trello.com/1/cards/x/download/photo.png",
        pos: 2,
        isUpload: true,
      },
    ]);
    expect(html).toContain("<strong>Links</strong>");
    expect(html).toContain(
      '<a href="https://blog.example.com/x" target="_blank" rel="noopener noreferrer nofollow">Blog post</a>',
    );
    // an uploaded file is not a link — it's downloaded/re-hosted instead
    expect(html).not.toContain("photo.png");
  });
});

describe("trelloJsonToBoard", () => {
  it("returns null for non-board payloads", () => {
    expect(trelloJsonToBoard(null)).toBeNull();
    expect(trelloJsonToBoard("<html>login</html>")).toBeNull();
    expect(trelloJsonToBoard({ name: "x" })).toBeNull();
  });

  it("maps lists/cards, skips closed, orders by pos, merges checklists, attachments, comments", () => {
    const board = trelloJsonToBoard({
      name: "My Board",
      lists: [
        { id: "l2", name: "Second", pos: 2 },
        { id: "l1", name: "First", pos: 1 },
        { id: "l3", name: "Archived", pos: 3, closed: true },
      ],
      cards: [
        {
          id: "c1",
          idList: "l1",
          name: "Card B",
          pos: 2,
          desc: "",
          dueComplete: true,
        },
        {
          id: "c2",
          idList: "l1",
          name: "Card A",
          pos: 1,
          desc: "**bold**",
          attachments: [
            {
              name: "Doc",
              url: "https://example.com/doc",
              pos: 1,
              isUpload: false,
            },
            {
              name: "pic.png",
              url: "https://trello.com/1/cards/c2/download/pic.png",
              pos: 2,
              isUpload: true,
              mimeType: null,
              bytes: 1234,
            },
          ],
        },
        { id: "c3", idList: "l1", name: "Gone", pos: 3, closed: true },
      ],
      checklists: [
        {
          idCard: "c2",
          name: "Steps",
          pos: 1,
          checkItems: [{ name: "do it", state: "complete", pos: 1 }],
        },
      ],
      actions: [
        {
          type: "commentCard",
          date: "2024-01-02T00:00:00.000Z",
          data: { text: "second comment", card: { id: "c2" } },
          memberCreator: { fullName: "Jane Doe" },
        },
        {
          type: "commentCard",
          date: "2024-01-01T00:00:00.000Z",
          data: { text: "first comment", card: { id: "c2" } },
          memberCreator: { username: "john" },
        },
        { type: "updateCard", data: { card: { id: "c2" } } },
      ],
    });

    expect(board).not.toBeNull();
    expect(board!.name).toBe("My Board");
    // closed list dropped, remaining ordered by pos
    expect(board!.areas.map((a) => a.name)).toEqual(["First", "Second"]);

    const first = board!.areas[0];
    // closed card dropped, remaining ordered by pos (Card A before Card B)
    expect(first.cards.map((c) => c.name)).toEqual(["Card A", "Card B"]);
    const cardA = first.cards[0];
    const cardB = first.cards[1];
    // description + checklist + LINK attachment, sanitized
    expect(cardA.content).toContain("<strong>bold</strong>");
    expect(cardA.content).toContain('data-type="taskList"');
    expect(cardA.content).toContain("do it");
    expect(cardA.content).toContain('href="https://example.com/doc"');
    // the uploaded file is NOT in the description — it's queued for download
    expect(cardA.content).not.toContain("pic.png");
    expect(cardA.attachments.map((a) => a.name)).toEqual(["pic.png"]);
    expect(cardA.attachments[0].bytes).toBe(1234);
    // Trello completion flag → card status
    expect(cardA.status).toBe(0);
    expect(cardB.status).toBe(1);
    // comments imported (non-comment actions ignored), ordered oldest-first,
    // author name preserved
    expect(cardA.comments.map((c) => c.authorName)).toEqual(["john", "Jane Doe"]);
    expect(cardA.comments[0].content).toContain("first comment");
    expect(cardA.comments[1].date).toBe("2024-01-02T00:00:00.000Z");
  });

  it("falls back to a default board name", () => {
    const board = trelloJsonToBoard({ lists: [], cards: [] });
    expect(board!.name).toBe("Trello import");
    expect(board!.areas).toEqual([]);
  });

  it("resolves a comment author's full name from the board members list", () => {
    const board = trelloJsonToBoard({
      name: "B",
      lists: [{ id: "l1", name: "L", pos: 1 }],
      cards: [{ id: "c1", idList: "l1", name: "C", pos: 1 }],
      members: [{ id: "m1", fullName: "Florian Straßer", username: "kontakt" }],
      actions: [
        {
          type: "commentCard",
          date: "2024-01-01T00:00:00.000Z",
          idMemberCreator: "m1",
          data: { text: "hi", card: { id: "c1" } },
          // the action snapshot only carries the @username, no full name
          memberCreator: { username: "kontakt" },
        },
      ],
    });
    expect(board!.areas[0].cards[0].comments[0].authorName).toBe(
      "Florian Straßer",
    );
  });
});
