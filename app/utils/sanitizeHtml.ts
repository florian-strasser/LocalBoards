import DOMPurify from "isomorphic-dompurify";

// Rich-text content (card descriptions, comments) and notification messages are
// rendered with `v-html`, so any HTML they contain must be sanitized first to
// prevent stored XSS (e.g. `<img src=x onerror=...>` running JS in another
// collaborator's session). isomorphic-dompurify works in both SSR and the
// browser.
//
// The allowlist matches exactly what TipTap emits (see app/components
// CardEditor / starter-kit + image + task list + emoji). DOMPurify additionally
// strips all inline event handlers (`on*=`) and dangerous URI schemes
// (`javascript:`, etc.) by default — that is what neutralises the attack.

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "u",
  "code",
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "hr", // StarterKit horizontalRule (e.g. typing `---`)
  // GFM tables: markdown-it emits these, and content is authored as Markdown
  // (including by agents over MCP). Without them DOMPurify drops the structure
  // and leaves loose cell text behind.
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "a",
  "img",
  "span", // emoji nodes
  "div",
  "label",
  "input", // task-list checkboxes
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "class",
  "start", // orderedList custom start number
  "colspan",
  "rowspan",
  // task list (ul/li[data-type][data-checked], input[type=checkbox])
  "data-type",
  "data-checked",
  "type",
  "checked",
  "disabled",
  // emoji nodes (<span data-type="emoji" data-name="smile">)
  "data-name",
];

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS, ALLOWED_ATTR });
}
