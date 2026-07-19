import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { sanitizeHtml } from "./sanitizeHtml";

// Card descriptions and comments are stored as **Markdown**. These converters
// bridge the stored Markdown and the HTML the app renders / the TipTap editor
// works with.
//
//  - markdownToHtml / renderMarkdown : Markdown -> HTML (for display + editor load)
//  - htmlToMarkdown                  : HTML -> Markdown (for editor save + the
//                                      one-off migration of legacy HTML content)
//
// markdown-it runs with `html: false`, so any raw HTML embedded in stored
// Markdown is escaped rather than rendered — the stored-HTML XSS surface is gone
// by construction. renderMarkdown still runs the result through sanitizeHtml as
// a defence-in-depth net.

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
}).use(taskLists, { enabled: true, label: false });

// markdown-it-task-lists emits `<ul class="contains-task-list">` with
// `<li class="task-list-item"><input type="checkbox" [checked]> text</li>`.
// The app's editor (TipTap TaskList) and read-only styles expect the ProseMirror
// shape instead: `<ul data-type="taskList">` / `<li data-type="taskItem"
// data-checked>` with the label+checkbox+content wrapper.
//
// CommonMark merges a bullet list immediately followed by a checklist (same
// marker) into one loose list, so a "contains-task-list" `<ul>` can hold both
// plain and task items. We split each run so plain items stay a normal bullet
// list (keeping their markers) and task items become a taskList.
function taskItemToHtml(li: string): string {
  const checked = /<input[^>]*\bchecked\b/i.test(li);
  let text = li
    .replace(/^<li[^>]*>/i, "")
    .replace(/<\/li>\s*$/i, "")
    .replace(/<input[^>]*>/i, "")
    .trim();
  if (!/^<p[\s>]/i.test(text)) text = `<p>${text}</p>`;
  const box = checked
    ? '<input type="checkbox" checked>'
    : '<input type="checkbox">';
  return `<li data-type="taskItem" data-checked="${checked}"><label>${box}<span></span></label><div>${text}</div></li>`;
}

function toTaskListHtml(html: string): string {
  if (!html.includes("contains-task-list")) return html;
  return html.replace(
    /<(ul|ol) class="contains-task-list">([\s\S]*?)<\/\1>/g,
    (_m, tag: string, inner: string) => {
      const items = inner.match(/<li[^>]*>[\s\S]*?<\/li>/g) || [];
      let out = "";
      let buffer: string[] = [];
      let bufferIsTask: boolean | null = null;
      const flush = () => {
        if (!buffer.length) return;
        out += bufferIsTask
          ? `<ul data-type="taskList">${buffer.join("")}</ul>`
          : `<${tag}>${buffer.join("")}</${tag}>`;
        buffer = [];
      };
      for (const li of items) {
        const isTask = /class="[^"]*task-list-item/.test(li);
        if (bufferIsTask !== null && isTask !== bufferIsTask) flush();
        bufferIsTask = isTask;
        buffer.push(isTask ? taskItemToHtml(li) : li);
      }
      flush();
      return out;
    },
  );
}

export function markdownToHtml(markdown: string | null | undefined): string {
  if (!markdown) return "";
  return toTaskListHtml(md.render(markdown));
}

// Display helper: Markdown -> sanitized HTML for v-html.
export function renderMarkdown(markdown: string | null | undefined): string {
  return sanitizeHtml(markdownToHtml(markdown));
}

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
  strongDelimiter: "**",
  linkStyle: "inlined",
});
turndown.use(gfm);

// turndown-plugin-gfm emits single-tilde strikethrough (`~text~`), but
// markdown-it only recognises the double-tilde form — so a round-trip through
// the editor silently degraded `~~text~~` into literal tildes. Re-register the
// rule with the form both sides agree on.
turndown.addRule("strikethrough", {
  filter: ["del", "s"],
  replacement: (content) => `~~${content}~~`,
});

// TipTap task items: `<li data-type="taskItem" data-checked>` -> `- [x] text`.
turndown.addRule("tiptapTaskItem", {
  filter: (node) =>
    node.nodeName === "LI" && node.getAttribute("data-type") === "taskItem",
  replacement: (_content, node) => {
    const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
    // The visible text lives in the item's content wrapper (a <div>), not the
    // label/checkbox — pull it from there so the checkbox markup is dropped.
    const body = (node as HTMLElement).querySelector("div") ?? node;
    const text = turndown.turndown((body as HTMLElement).innerHTML).trim();
    return `- [${checked ? "x" : " "}] ${text.replace(/\n+/g, " ")}\n`;
  },
});

// Emoji nodes render as a span wrapping the glyph — keep the plain unicode.
turndown.addRule("emojiSpan", {
  filter: (node) =>
    node.nodeName === "SPAN" && node.getAttribute("data-type") === "emoji",
  replacement: (content, node) => content || (node as HTMLElement).textContent || "",
});

export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return "";
  return turndown.turndown(html).trim();
}
