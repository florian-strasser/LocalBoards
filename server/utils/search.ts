// Helpers for the global search.

// `%` and `_` are wildcards in LIKE, and a user typing "100%" or "draft_v2"
// means those literally. Escaping them (and the escape character itself) keeps
// the query meaning what it says instead of matching everything.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Descriptions and comments are stored as Markdown, and a snippet is a fragment
// cut from the middle of one — so its block structure is usually broken anyway
// (half a list, an unclosed fence). Rather than render that, reduce it to the
// prose a reader cares about: keep link and image labels, turn task boxes into
// a glyph, and drop the syntax that would otherwise show up as literal `**`,
// `- [ ]` and `](https://…)` in the results.
export function flattenMarkdown(text: string | null | undefined): string {
  if (!text) return "";
  return (
    String(text)
      // Fenced and inline code: keep the code itself, lose the fences/ticks.
      .replace(/```[^\n]*\n?/g, " ")
      .replace(/`([^`]*)`/g, "$1")
      // Images before links — an image is a link with a leading "!".
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\(([^)]*)\)/g, (_m, label, href) => label || href)
      // Task items keep their state; it's the point of the line.
      .replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[[xX]\][ \t]+/gm, "☑ ")
      .replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[ \][ \t]+/gm, "☐ ")
      // Plain list markers, headings and quotes carry no meaning in one line.
      .replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/gm, "")
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
      .replace(/^[ \t]*>[ \t]?/gm, "")
      // Horizontal rules.
      .replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, " ")
      // Emphasis markers around text.
      .replace(/(\*\*|__|~~)(.*?)\1/g, "$2")
      .replace(/(^|[\s(])[*_](\S(?:.*?\S)?)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
      .replace(/\s+/g, " ")
      .trim()
  );
}

// A short piece of the matched text, centred on the first occurrence, so a hit
// deep inside a long description shows *why* it matched.
export function searchSnippet(
  text: string | null | undefined,
  query: string,
  radius = 60,
): string {
  if (!text) return "";
  // Flatten first so the offsets — and therefore the highlight in the UI —
  // refer to the text the reader actually sees.
  const flat = flattenMarkdown(text);
  if (!query) return flat.slice(0, radius * 2);

  const at = flat.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return flat.slice(0, radius * 2) + (flat.length > radius * 2 ? "…" : "");

  const start = Math.max(0, at - radius);
  const end = Math.min(flat.length, at + query.length + radius);
  return (
    (start > 0 ? "…" : "") + flat.slice(start, end) + (end < flat.length ? "…" : "")
  );
}
