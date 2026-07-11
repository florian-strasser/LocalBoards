import { sanitizeHtml } from "../../app/utils/sanitizeHtml";

// Pure helpers for the Trello board import (server/api/data/import/trello.ts).
// Kept here — free of DB/HTTP — so the parsing and Markdown→HTML conversion can
// be unit-tested in isolation.

// Guard rails so a pathological board can't create an unbounded amount of data.
export const MAX_LISTS = 500;
export const MAX_CARDS = 5000;
const NAME_MAX = 255;

// Pull the board shortLink (or 24-char id) out of a pasted Trello URL. Accepts
// e.g. https://trello.com/b/AbCd1234/my-board (with or without the slug, with or
// without a trailing .json). Returns null if it isn't a Trello *board* URL.
export function parseTrelloShortLink(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const match = input.match(/trello\.com\/b\/([A-Za-z0-9]{4,32})/i);
  return match ? match[1] : null;
}

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Best-effort inline Markdown → HTML on already-escaped text: code spans, links,
// bold and italics. Not a full parser — just the common cases Trello uses.
function inlineMarkdown(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer nofollow">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?])/g, "$1<em>$2</em>");
}

// Convert a Trello card description (Markdown) to HTML. Block level: headings,
// bullet/numbered lists and paragraphs (single newlines inside a paragraph
// become <br>).
export function descriptionToHtml(desc: string): string {
  if (!desc || !desc.trim()) return "";
  const lines = desc.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${paragraph.join("<br>")}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listType && listItems.length) {
      out.push(`<${listType}>${listItems.join("")}</${listType}>`);
    }
    listType = null;
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);

    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      out.push(
        `<h${level}>${inlineMarkdown(escapeHtml(heading[2]))}</h${level}>`,
      );
    } else if (bullet) {
      flushParagraph();
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(`<li><p>${inlineMarkdown(escapeHtml(bullet[1]))}</p></li>`);
    } else if (ordered) {
      flushParagraph();
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(
        `<li><p>${inlineMarkdown(escapeHtml(ordered[1]))}</p></li>`,
      );
    } else if (line.trim() === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(inlineMarkdown(escapeHtml(line)));
    }
  }
  flushParagraph();
  flushList();
  return out.join("");
}

// Render a Trello checklist as a TipTap task list so it comes across as an
// interactive checklist rather than plain text.
export function checklistToHtml(
  name: string,
  items: Array<{ name: string; state: string; pos: number }>,
): string {
  const ordered = [...(items || [])].sort((a, b) => (a.pos || 0) - (b.pos || 0));
  const lis = ordered
    .map((it) => {
      const checked = it.state === "complete";
      const box = checked
        ? '<input type="checkbox" checked>'
        : '<input type="checkbox">';
      return `<li data-type="taskItem" data-checked="${checked}"><label>${box}<span></span></label><div><p>${inlineMarkdown(
        escapeHtml(it.name || ""),
      )}</p></div></li>`;
    })
    .join("");
  const heading = name ? `<p><strong>${escapeHtml(name)}</strong></p>` : "";
  return `${heading}<ul data-type="taskList">${lis}</ul>`;
}

// Trello has two kinds of attachment. **Link** attachments (isUpload false) are
// just URLs — there's no file to host, so we keep them as links appended to the
// card description. **File** attachments (isUpload true) are real uploads; their
// download URL 302-redirects to a public S3 file for public boards, so the
// import endpoint downloads and re-hosts those as normal LocalBoards
// attachments (see ImportedAttachment below).
export function linkAttachmentsToHtml(attachments: any[]): string {
  const list = (attachments || []).filter(
    (a: any) => a && a.isUpload !== true && (a.url || a.name),
  );
  if (list.length === 0) return "";
  const items = list
    .sort((a: any, b: any) => (a.pos || 0) - (b.pos || 0))
    .map((a: any) => {
      const label = escapeHtml(a.name || a.fileName || a.url || "attachment");
      const url = typeof a.url === "string" ? a.url : "";
      if (/^https?:\/\//i.test(url)) {
        return `<li><p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer nofollow">${label}</a></p></li>`;
      }
      return `<li><p>${label}</p></li>`;
    })
    .join("");
  return `<p><strong>Links</strong></p><ul>${items}</ul>`;
}

export interface ImportedComment {
  authorName: string;
  content: string;
  date: string | null;
}

// A Trello uploaded file the import endpoint should download and re-host.
export interface ImportedAttachment {
  name: string;
  url: string;
  mimeType: string;
  bytes: number | null;
}

export interface ImportedBoard {
  name: string;
  areas: Array<{
    name: string;
    cards: Array<{
      name: string;
      content: string;
      status: number;
      comments: ImportedComment[];
      attachments: ImportedAttachment[];
    }>;
  }>;
}

// Transform a parsed Trello board-JSON export into the structure LocalBoards
// stores: a board name, its open lists (areas) in order, and each list's open
// cards (name + description + checklists + attachment links, as sanitized HTML,
// plus comments). Returns null when the payload isn't a readable board export.
export function trelloJsonToBoard(trello: any): ImportedBoard | null {
  if (!trello || typeof trello !== "object" || !Array.isArray(trello.lists)) {
    return null;
  }

  const byPos = (a: any, b: any) => (a.pos || 0) - (b.pos || 0);

  const lists = (trello.lists || [])
    .filter((l: any) => l && !l.closed)
    .sort(byPos)
    .slice(0, MAX_LISTS);

  const checklistsByCard = new Map<string, any[]>();
  for (const cl of trello.checklists || []) {
    if (!cl || !cl.idCard) continue;
    if (!checklistsByCard.has(cl.idCard)) checklistsByCard.set(cl.idCard, []);
    checklistsByCard.get(cl.idCard)!.push(cl);
  }

  // The authoritative member display name lives in the board's member list;
  // the memberCreator snapshot embedded in each action can lack a full name
  // (then it would fall back to the @username), so prefer members[] by id.
  const membersById = new Map<string, { fullName: string; username: string }>();
  for (const m of trello.members || []) {
    if (m && m.id) {
      membersById.set(m.id, {
        fullName: typeof m.fullName === "string" ? m.fullName : "",
        username: typeof m.username === "string" ? m.username : "",
      });
    }
  }

  // Comments live in the board's action feed (capped at ~1000 by Trello's
  // export), keyed by the card they belong to. The Trello author's name is kept
  // for display; the comment isn't linked to any local user account.
  const commentsByCard = new Map<string, ImportedComment[]>();
  for (const action of trello.actions || []) {
    if (!action || action.type !== "commentCard") continue;
    const cardId = action.data?.card?.id;
    const text = action.data?.text;
    if (!cardId || !text) continue;
    const creatorId = action.idMemberCreator || action.memberCreator?.id;
    const member = creatorId ? membersById.get(creatorId) : undefined;
    const author =
      member?.fullName ||
      action.memberCreator?.fullName ||
      member?.username ||
      action.memberCreator?.username ||
      "Trello";
    if (!commentsByCard.has(cardId)) commentsByCard.set(cardId, []);
    commentsByCard.get(cardId)!.push({
      authorName: String(author).slice(0, NAME_MAX),
      content: sanitizeHtml(descriptionToHtml(text)),
      date: typeof action.date === "string" ? action.date : null,
    });
  }

  const cardsByList = new Map<string, any[]>();
  let cardBudget = MAX_CARDS;
  const openCards = (trello.cards || [])
    .filter((c: any) => c && !c.closed)
    .sort(byPos);
  for (const card of openCards) {
    if (cardBudget <= 0) break;
    if (!cardsByList.has(card.idList)) cardsByList.set(card.idList, []);
    cardsByList.get(card.idList)!.push(card);
    cardBudget--;
  }

  const name =
    (typeof trello.name === "string" && trello.name.trim()) || "Trello import";

  const areas = lists.map((list: any) => {
    const cards = (cardsByList.get(list.id) || []).map((card: any) => {
      let content = descriptionToHtml(card.desc || "");
      const checklists = (checklistsByCard.get(card.id) || []).sort(byPos);
      for (const cl of checklists) {
        content += checklistToHtml(cl.name || "", cl.checkItems || []);
      }
      // Link attachments go in the description; uploaded files are downloaded
      // and re-hosted by the endpoint.
      const rawAttachments = card.attachments || [];
      content += linkAttachmentsToHtml(rawAttachments);
      const attachments: ImportedAttachment[] = rawAttachments
        .filter(
          (a: any) =>
            a &&
            a.isUpload === true &&
            typeof a.url === "string" &&
            /^https?:\/\//i.test(a.url),
        )
        .sort((a: any, b: any) => (a.pos || 0) - (b.pos || 0))
        .map((a: any) => ({
          name: String(a.name || a.fileName || "attachment").slice(0, NAME_MAX),
          url: a.url,
          mimeType: typeof a.mimeType === "string" ? a.mimeType : "",
          bytes: typeof a.bytes === "number" ? a.bytes : null,
        }));

      const comments = (commentsByCard.get(card.id) || [])
        .slice()
        .sort(
          (a, b) =>
            new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime(),
        );

      // A card counts as done if Trello's completion flag is set (the "mark
      // complete" checkmark / a completed due date).
      const status =
        card.dueComplete === true || !!card.dateCompleted ? 1 : 0;

      return {
        name: String(card.name || "").slice(0, NAME_MAX) || "—",
        content: sanitizeHtml(content),
        status,
        comments,
        attachments,
      };
    });
    return { name: String(list.name || "").slice(0, NAME_MAX), cards };
  });

  return { name: name.slice(0, NAME_MAX), areas };
}
