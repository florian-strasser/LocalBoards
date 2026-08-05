import { describe, it, expect } from "vitest";
import {
  escapeLike,
  flattenMarkdown,
  searchSnippet,
} from "../server/utils/search";

describe("escapeLike", () => {
  it("keeps LIKE wildcards literal", () => {
    // Without this, searching for "100%" would match every row.
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("draft_v2")).toBe("draft\\_v2");
    expect(escapeLike("back\\slash")).toBe("back\\\\slash");
  });

  it("leaves ordinary text alone", () => {
    expect(escapeLike("Redesign the logo")).toBe("Redesign the logo");
  });
});

describe("searchSnippet", () => {
  it("centres the snippet on the match and marks the cuts", () => {
    const text = "a".repeat(200) + " needle " + "b".repeat(200);
    const snippet = searchSnippet(text, "needle");
    expect(snippet).toContain("needle");
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet.length).toBeLessThan(200);
  });

  it("does not add an ellipsis when the whole text fits", () => {
    expect(searchSnippet("short and sweet", "sweet")).toBe("short and sweet");
  });

  it("collapses newlines so a snippet stays on one line", () => {
    expect(searchSnippet("first line\n\nsecond line", "second")).toBe(
      "first line second line",
    );
  });

  it("shows prose, not Markdown syntax", () => {
    // What a snippet used to look like: "Mal sehen1 - [x] Test - [ ] Aha".
    expect(searchSnippet("Mal sehen1\n- [x] Test\n- [ ] Aha", "Test")).toBe(
      "Mal sehen1 ☑ Test ☐ Aha",
    );
  });

  it("matches case-insensitively", () => {
    expect(searchSnippet("The Roadmap for 2026", "roadmap")).toContain("Roadmap");
  });

  it("is empty for missing content", () => {
    expect(searchSnippet(null, "x")).toBe("");
    expect(searchSnippet(undefined, "x")).toBe("");
    expect(searchSnippet("", "x")).toBe("");
  });
});

describe("flattenMarkdown", () => {
  it("keeps the label of a link instead of the URL soup", () => {
    expect(
      flattenMarkdown("Sehr guter Test für den [Link](https://www.example.com)"),
    ).toBe("Sehr guter Test für den Link");
  });

  it("falls back to the URL when a link has no label", () => {
    expect(flattenMarkdown("see [](https://example.com)")).toBe(
      "see https://example.com",
    );
  });

  it("keeps image alt text", () => {
    expect(flattenMarkdown("![a diagram](/uploads/x.png) follows")).toBe(
      "a diagram follows",
    );
  });

  it("marks task items with their state", () => {
    expect(flattenMarkdown("- [x] done\n- [ ] open")).toBe("☑ done ☐ open");
  });

  it("drops headings, quotes, bullets and rules", () => {
    expect(
      flattenMarkdown("# Title\n\n> quoted\n\n- one\n- two\n\n---\n\nend"),
    ).toBe("Title quoted one two end");
  });

  it("removes emphasis and code markers but keeps the words", () => {
    expect(flattenMarkdown("**bold** _italic_ ~~gone~~ `code`")).toBe(
      "bold italic gone code",
    );
  });

  it("leaves ordinary punctuation and lone symbols alone", () => {
    expect(flattenMarkdown("5 * 3 = 15, a_b_c stays")).toBe(
      "5 * 3 = 15, a_b_c stays",
    );
  });

  it("is empty for nothing", () => {
    expect(flattenMarkdown(null)).toBe("");
    expect(flattenMarkdown("")).toBe("");
  });
});
