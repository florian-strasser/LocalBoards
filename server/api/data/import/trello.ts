import { setupDatabase } from "../../../../app/lib/databaseSetup";
import { resolveUserId } from "../../../utils/auth";
import { parseTrelloShortLink, trelloJsonToBoard } from "../../../utils/trelloImport";

// Import a whole board from Trello by its public share link. Trello exposes any
// *public* board as JSON at `https://trello.com/b/<shortLink>.json`; we fetch
// that (never an arbitrary user-supplied URL — only a trello.com URL derived
// from the shortLink, so this can't be used for SSRF) and recreate the board,
// its lists (areas), cards (name + description + checklists + status + comments)
// and uploaded attachments locally. Parsing/conversion lives in
// server/utils/trelloImport.ts (unit-tested).

// Per-file cap kept comfortably under MySQL's default max_allowed_packet once
// base64-encoded (~10MB → ~13.3MB), plus an overall count cap.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS_TOTAL = 300;

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
  zip: "application/zip",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

// Trello's own mimeType is often null and the S3 response is a generic
// octet-stream, so prefer a well-known extension (needed for the app to treat an
// image as viewable) before falling back to the reported types.
function guessMimeType(name: string, provided: string, responseType: string): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (EXT_MIME[ext]) return EXT_MIME[ext];
  if (provided && provided.includes("/")) return provided;
  if (responseType && responseType.includes("/") && !responseType.includes("html")) {
    return responseType.split(";")[0].trim();
  }
  return "application/octet-stream";
}

// Download an uploaded Trello attachment. The download URL 302-redirects to a
// (public, for public boards) S3 object — `redirect: "follow"` chases that. The
// size cap is enforced via content-length and after the fact. Returns null on
// any failure so a bad attachment never fails the whole import.
async function downloadAttachment(
  url: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "LokalBoards board importer" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const declared = Number(res.headers.get("content-length") || 0);
    if (declared && declared > MAX_ATTACHMENT_BYTES) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength === 0 || ab.byteLength > MAX_ATTACHMENT_BYTES) return null;
    return {
      buffer: Buffer.from(ab),
      contentType: res.headers.get("content-type") || "",
    };
  } catch (err) {
    logger.error("Trello attachment download failed:", err);
    return null;
  }
}

export default defineEventHandler(async (event) => {
  if (event.req.method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  const auth = await resolveUserId(event);
  if (!auth.ok) {
    event.res.statusCode = auth.status;
    return { error: auth.error };
  }
  const userId = auth.userId;

  const { url } = (await readBody(event)) || {};
  const shortLink = parseTrelloShortLink(url);
  if (!shortLink) {
    event.res.statusCode = 400;
    return { error: "TRELLO_INVALID_URL" };
  }

  // Fetch the board JSON from Trello. Only *public* boards are readable this
  // way — a private (or missing) board 302-redirects to login. `redirect:
  // "manual"` means we treat any non-200 as "not accessible" and never follow a
  // redirect to another host (SSRF hardening).
  let trello: any;
  try {
    const res = await fetch(`https://trello.com/b/${shortLink}.json`, {
      redirect: "manual",
      headers: {
        accept: "application/json",
        "user-agent": "LokalBoards board importer",
      },
      signal: AbortSignal.timeout(20000),
    });
    const contentType = res.headers.get("content-type") || "";
    if (res.status !== 200 || !contentType.includes("json")) {
      logger.error("Trello import: not accessible (status", res.status + ")");
      event.res.statusCode = 400;
      return { error: "TRELLO_NOT_ACCESSIBLE" };
    }
    trello = await res.json();
  } catch (err: any) {
    logger.error("Trello import fetch failed:", err);
    event.res.statusCode = 400;
    return { error: "TRELLO_NOT_ACCESSIBLE" };
  }

  const structure = trelloJsonToBoard(trello);
  if (!structure) {
    event.res.statusCode = 400;
    return { error: "TRELLO_NOT_ACCESSIBLE" };
  }
  if (structure.areas.length === 0) {
    event.res.statusCode = 400;
    return { error: "TRELLO_EMPTY" };
  }

  const db = await setupDatabase();
  const conn = await db.getConnection();
  let newBoardId: number;
  // Uploaded attachments are downloaded and inserted *after* the structural
  // transaction commits (best-effort, additive) so slow network fetches don't
  // hold the board/areas/cards write open or roll everything back on one bad
  // file.
  const pendingAttachments: Array<{
    cardId: number;
    name: string;
    url: string;
    mimeType: string;
    bytes: number | null;
  }> = [];
  try {
    await conn.beginTransaction();

    const [boardResult]: any = await conn.execute(
      "INSERT INTO boards (user, name, style, image, status) VALUES (?, ?, 'kanban', NULL, 'private')",
      [userId, structure.name],
    );
    newBoardId = boardResult.insertId;

    let areaSort = 0;
    for (const area of structure.areas) {
      const [areaResult]: any = await conn.execute(
        "INSERT INTO areas (board, name, sort) VALUES (?, ?, ?)",
        [newBoardId, area.name, areaSort++],
      );
      const areaId = areaResult.insertId;

      let cardSort = 0;
      for (const card of area.cards) {
        const [cardResult]: any = await conn.execute(
          "INSERT INTO cards (area, name, content, status, sort) VALUES (?, ?, ?, ?, ?)",
          [areaId, card.name, card.content || null, card.status, cardSort++],
        );
        const cardId = cardResult.insertId;

        // Imported comments aren't tied to a local user (user = NULL); the
        // original Trello author name is kept in authorName (shown as a plain,
        // non-editable label), and the original timestamp is preserved.
        for (const comment of card.comments) {
          await conn.execute(
            "INSERT INTO comments (card, user, authorName, content, date) VALUES (?, NULL, ?, ?, ?)",
            [
              cardId,
              comment.authorName,
              comment.content || null,
              comment.date ? new Date(comment.date) : new Date(),
            ],
          );
        }

        for (const att of card.attachments) {
          pendingAttachments.push({ cardId, ...att });
        }
      }
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    logger.error("Trello import failed:", error);
    event.res.statusCode = 500;
    return { error: "TRELLO_IMPORT_FAILED" };
  } finally {
    conn.release();
  }

  // Download + re-host uploaded attachments (best-effort; failures are skipped
  // so the imported board is never lost over one file).
  let attCount = 0;
  for (const att of pendingAttachments) {
    if (attCount >= MAX_ATTACHMENTS_TOTAL) break;
    if (att.bytes && att.bytes > MAX_ATTACHMENT_BYTES) continue;
    const file = await downloadAttachment(att.url);
    if (!file) continue;
    try {
      await db.execute(
        "INSERT INTO attachments (card, filename, filetype, filesize, filedata) VALUES (?, ?, ?, ?, ?)",
        [
          att.cardId,
          att.name.slice(0, 255),
          guessMimeType(att.name, att.mimeType, file.contentType).slice(0, 100),
          file.buffer.length,
          file.buffer.toString("base64"),
        ],
      );
      attCount++;
    } catch (err) {
      logger.error("Trello attachment insert failed:", err);
    }
  }

  const [rows]: any = await db.execute("SELECT * FROM boards WHERE id = ?", [
    newBoardId,
  ]);
  return { success: true, board: rows[0] };
});
