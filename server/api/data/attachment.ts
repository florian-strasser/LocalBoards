import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

// A `Content-Disposition` value carrying the attachment's original filename.
// The quoted form is plain ASCII for old clients — anything outside printable
// ASCII (including a CR or LF, which would otherwise let a filename inject a
// header) is replaced — and the RFC 5987 `filename*` form carries the real
// name, which is what every current browser uses.
const contentDisposition = (
  type: "inline" | "attachment",
  filename: string,
): string => {
  const name = filename || "file";
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

// Path-based attachments are stored as `/api/uploads/<generated name>`.
const STORED_FILE = /^\/(?:api\/)?uploads\/([A-Za-z0-9._-]+)$/;

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  // Resolve the authenticated user (API key or session).
  const auth = await resolveUserId(event);
  if (!auth.ok) {
    event.res.statusCode = auth.status;
    return { error: auth.error };
  }
  const userId = auth.userId;

  if (method !== "GET" && method !== "DELETE") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    const db = setupDatabase();

    const { id } = getQuery(event);

    // Validate id is a positive integer
    if (!id || isNaN(Number(id)) || Number(id) <= 0) {
      event.res.statusCode = 400;
      return { error: "Invalid attachment ID" };
    }

    // Fetch the attachment along with its card reference
    const [attachmentRows] = await db.execute(
      "SELECT id, card, filename, filetype, filesize, filedata FROM attachments WHERE id = ?",
      [id],
    );
    const attachment = attachmentRows[0];

    if (!attachment) {
      // Generic error to prevent attachment enumeration
      event.res.statusCode = 404;
      return { error: "Resource not found" };
    }

    // Verify the card exists
    const [cardRows] = await db.execute("SELECT * FROM cards WHERE id = ?", [
      attachment.card,
    ]);
    const card = cardRows[0];

    if (!card) {
      event.res.statusCode = 404;
      return { error: "Resource not found" };
    }

    // Verify the board exists and check access (read to view, edit to delete).
    const [boardRows] = await db.execute(
      "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
      [card.area],
    );
    const board = boardRows[0];

    if (!board) {
      event.res.statusCode = 404;
      return { error: "Resource not found" };
    }

    const decision = await authorizeBoard(
      db,
      board,
      userId,
      method === "DELETE" ? "edit" : "read",
    );
    if (!decision.ok) {
      event.res.statusCode = decision.status;
      return { error: decision.error };
    }

    if (method === "DELETE") {
      await db.execute("DELETE FROM attachments WHERE id = ?", [attachment.id]);
      // Best-effort removal of the on-disk file for path-based attachments
      // (base64 attachments live entirely in the DB row we just deleted).
      const data: string = attachment.filedata || "";
      const match = data.match(/\/(?:api\/)?uploads\/([A-Za-z0-9._-]+)$/);
      if (match) {
        try {
          const { unlink } = await import("node:fs/promises");
          const { join } = await import("node:path");
          await unlink(join(process.cwd(), "public", "uploads", match[1]));
        } catch {
          // File may already be gone or shared; ignore.
        }
      }
      return { success: true, id: attachment.id };
    }

    // Two ways to get the bytes rather than the metadata:
    //
    // `raw=1` serves the file inline, so it can be shown in a browser tab —
    // e.g. a PDF, whose in-page <iframe> rendering is unreliable on mobile.
    //
    // `download=1` serves it as a download. Only images and PDFs can be
    // displayed; a spreadsheet or a Word file can only ever be saved, so the
    // response says so instead of leaving it to the browser to work out.
    const wantsDownload = Boolean(getQuery(event).download);
    if (getQuery(event).raw || wantsDownload) {
      const data: string = attachment.filedata || "";
      const disposition = contentDisposition(
        wantsDownload ? "attachment" : "inline",
        attachment.filename,
      );
      const filetype = attachment.filetype || "application/octet-stream";

      // A stored file is normally served by /api/uploads, which knows only the
      // generated storage name and always says `inline`. For a download it is
      // read here instead, so the response carries the original filename and
      // the browser saves "Quartalszahlen.xlsx" rather than a hex string.
      const stored = data.match(STORED_FILE);
      if (stored && wantsDownload) {
        const { createReadStream } = await import("node:fs");
        const { stat } = await import("node:fs/promises");
        const { join, resolve } = await import("node:path");

        const uploadDir = resolve(join(process.cwd(), "public", "uploads"));
        const fullPath = resolve(uploadDir, stored[1]);
        // The pattern above already excludes separators, but resolve the path
        // and check it anyway — the same guard /api/uploads applies.
        if (!fullPath.startsWith(uploadDir)) {
          event.res.statusCode = 404;
          return { error: "Resource not found" };
        }
        try {
          const info = await stat(fullPath);
          if (!info.isFile()) throw new Error("not a file");
          setHeader(event, "content-length", info.size);
        } catch {
          event.res.statusCode = 404;
          return { error: "Resource not found" };
        }
        setHeader(event, "content-type", filetype);
        setHeader(event, "content-disposition", disposition);
        return createReadStream(fullPath);
      }

      if (/^https?:\/\//.test(data) || data.startsWith("/")) {
        return sendRedirect(event, data, 302);
      }
      const buffer = Buffer.from(data, "base64");
      setHeader(event, "content-type", filetype);
      setHeader(event, "content-disposition", disposition);
      return buffer;
    }

    return {
      id: attachment.id,
      filename: attachment.filename,
      filetype: attachment.filetype,
      filesize: attachment.filesize,
      filedata: attachment.filedata,
    };
  } catch (error) {
    logger.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
