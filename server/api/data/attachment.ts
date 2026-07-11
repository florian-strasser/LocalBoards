import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

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

    // Raw mode: serve the actual file (inline) so it can be opened in a new
    // browser tab — e.g. a PDF, whose in-page <iframe> rendering is unreliable
    // on mobile. URL/path-based attachments redirect to the servable file;
    // base64 ones are decoded and streamed.
    if (getQuery(event).raw) {
      const data: string = attachment.filedata || "";
      if (/^https?:\/\//.test(data) || data.startsWith("/")) {
        return sendRedirect(event, data, 302);
      }
      const buffer = Buffer.from(data, "base64");
      setHeader(
        event,
        "content-type",
        attachment.filetype || "application/octet-stream",
      );
      setHeader(
        event,
        "content-disposition",
        `inline; filename="${encodeURIComponent(attachment.filename || "file")}"`,
      );
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
