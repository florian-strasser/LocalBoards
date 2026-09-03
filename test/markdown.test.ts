import { describe, it, expect } from "vitest";
import {
  markdownToHtml,
  renderMarkdown,
  htmlToMarkdown,
} from "../app/utils/markdown";
import { sanitizeHtml } from "../app/utils/sanitizeHtml";

// The legacy TipTap HTML the migration must convert (mirrors seeded content).
const legacyHtml =
  '<p>Refresh the brand mark. Keep it <strong>simple</strong> and <em>legible</em>.</p>' +
  '<h3>Requirements</h3>' +
  '<ul><li><p>Light and dark backgrounds</p></li><li><p>Scales to 16px</p></li></ul>' +
  '<ul data-type="taskList">' +
  '<li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>Collect references</p></div></li>' +
  '<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>First concepts</p></div></li>' +
  '</ul>' +
  '<p>See <a href="https://example.com">the brief</a>.</p>';

describe("htmlToMarkdown (migration + editor save)", () => {
  it("converts legacy TipTap HTML to clean Markdown", () => {
    const out = htmlToMarkdown(legacyHtml);
    expect(out).toContain("Keep it **simple** and _legible_.");
    expect(out).toContain("### Requirements");
    expect(out).toContain("-   Light and dark backgrounds");
    expect(out).toContain("- [x] Collect references");
    expect(out).toContain("- [ ] First concepts");
    expect(out).toContain("[the brief](https://example.com)");
    // no HTML tags leak through
    expect(out).not.toMatch(/<\/?(p|ul|li|strong|div|label|input)\b/i);
  });

  it("keeps emoji as plain unicode", () => {
    expect(htmlToMarkdown('<p>Nice <span data-type="emoji">👍</span></p>')).toBe(
      "Nice 👍",
    );
  });

  it("returns empty string for empty input", () => {
    expect(htmlToMarkdown("")).toBe("");
    expect(htmlToMarkdown(null)).toBe("");
  });
});

describe("markdownToHtml (display + editor load)", () => {
  it("renders task lists in the TipTap/wysiwyg shape", () => {
    const html = markdownToHtml("- [x] done\n- [ ] todo");
    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('data-type="taskItem" data-checked="true"');
    expect(html).toContain('data-type="taskItem" data-checked="false"');
    expect(html).toContain('<input type="checkbox" checked>');
    expect(html).toContain("done");
  });

  it("splits a bullet list merged with a following checklist", () => {
    // CommonMark merges these into one <ul>; we split so the plain items keep
    // their bullets and only the checked items become a task list.
    const html = markdownToHtml("- a\n- b\n\n- [x] done\n- [ ] todo");
    const plainIdx = html.indexOf("<ul>"); // a plain bullet list (no data-type)
    const taskIdx = html.indexOf('<ul data-type="taskList">');
    expect(plainIdx).toBeGreaterThanOrEqual(0);
    expect(taskIdx).toBeGreaterThan(plainIdx);
    // plain items stay in the bullet list; checked items in the task list
    expect(html.slice(plainIdx, taskIdx)).toContain(">a<");
    expect(html.slice(taskIdx)).toContain("done");
    expect(html).toContain('data-type="taskItem" data-checked="true"');
    // the plain "a" item is not a task item
    expect(html.slice(plainIdx, taskIdx)).not.toContain("taskItem");
  });

  it("renders common Markdown", () => {
    const html = markdownToHtml("# Title\n\n**bold** and _em_\n\n- a\n- b");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>em</em>");
    expect(html).toContain("<li>a</li>");
  });

  it("does NOT render raw HTML embedded in markdown (XSS-safe)", () => {
    const html = markdownToHtml('<img src=x onerror="alert(1)"> hi');
    // raw HTML is escaped to inert text, not emitted as a live element
    expect(html).not.toMatch(/<img\b/i);
    expect(html).toContain("&lt;img");
  });
});

describe("round-trip stability", () => {
  it("md -> html -> md is stable for a rich document", () => {
    const once = htmlToMarkdown(markdownToHtml(htmlToMarkdown(legacyHtml)));
    const twice = htmlToMarkdown(markdownToHtml(once));
    expect(twice).toBe(once);
  });

  it("renderMarkdown output survives sanitize with structure intact", () => {
    const html = renderMarkdown("- [x] done\n\n[link](https://x.com)");
    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('href="https://x.com"');
  });
});

describe("links in rendered content", () => {
  it("opens a Markdown link in a new tab", () => {
    const html = renderMarkdown("See [the docs](https://example.com/guide).");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("does the same for a bare address the renderer linkifies", () => {
    const html = renderMarkdown("See https://example.com/guide for details.");
    expect(html).toContain("<a ");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  // The reason `rel` is there: without `noopener` the opened page is handed a
  // reference to this tab and can navigate it somewhere else.
  it("replaces a rel the author supplied rather than trusting it", () => {
    const html = sanitizeHtml('<p><a href="https://example.com" rel="opener">x</a></p>');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('rel="opener"');
  });

  it("leaves an anchor with no href alone", () => {
    expect(sanitizeHtml("<p><a>not a link</a></p>")).not.toContain("target=");
  });

  it("still refuses a javascript: url", () => {
    const html = sanitizeHtml('<p><a href="javascript:alert(1)">x</a></p>');
    expect(html).not.toContain("javascript:");
  });
});
