import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

export default defineEventHandler(async (event) => {
  // Check the HTTP method
  const method = event.req.method;

  // Extract API key from headers
  const apiKey = event.headers.get("x-api-key");

  // Validate API key if provided
  let userIdFromApiKey = null;
  if (apiKey) {
    const data = await verifyApiKey(apiKey);

    if (data.error) {
      event.res.statusCode = 403;
      return { error: "Unauthorized access" };
    } else {
      userIdFromApiKey = data.key.userId;
    }
  }

  const session = await getSession(event);

  // Early auth check - block unauthenticated access
  if (!userIdFromApiKey && !session) {
    event.res.statusCode = 403;
    return { error: "Unauthorized access" };
  }

  const userId = userIdFromApiKey || session?.user.id;

  if (!userId) {
    event.res.statusCode = 403;
    return { error: "Unauthorized access" };
  }

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

    let readAccess = false;
    if (board.status === "private" && board.user !== userId) {
      const [invitationRows] = await db.execute(
        "SELECT permission FROM invitations WHERE board = ? AND user = ?",
        [board.id, userId],
      );

      if (invitationRows.length > 0) {
        readAccess = true;
      }
    } else if (board.user === userId) {
      readAccess = true;
    } else if (board.status === "public") {
      readAccess = true;
    }

    if (!readAccess) {
      event.res.statusCode = 403;
      return { error: "Unauthorized access" };
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
