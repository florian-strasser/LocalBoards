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

  if (method !== "GET") {
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

    // Verify the board exists and check read access
    const [boardRows] = await db.execute(
      "SELECT b.* FROM boards b JOIN areas a ON b.id = a.board WHERE a.id = ?",
      [card.area],
    );
    const board = boardRows[0];

    if (!board) {
      event.res.statusCode = 404;
      return { error: "Resource not found" };
    }

    const decision = await authorizeBoard(db, board, userId, "read");
    if (!decision.ok) {
      event.res.statusCode = decision.status;
      return { error: decision.error };
    }

    return {
      id: attachment.id,
      filename: attachment.filename,
      filetype: attachment.filetype,
      filesize: attachment.filesize,
      filedata: attachment.filedata,
    };
  } catch (error) {
    console.error("Database error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
