import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../../app/lib/databaseSetup";

// Partially mask an email so same-name users can be told apart in the picker
// without exposing the full address, e.g. "florian@example.com" -> "fl••@exa••.com".
function maskEmail(email: unknown): string {
  if (typeof email !== "string") return "";
  const at = email.indexOf("@");
  if (at < 1) return "";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const domainName = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  const mask = (s: string, keep: number) =>
    (s.length > keep ? s.slice(0, keep) : s.slice(0, 1)) + "••";
  return `${mask(local, 2)}@${mask(domainName, 3)}${tld}`;
}

// GET /api/data/users/search?boardId=123&q=ali
//
// Returns users the board owner can invite, matched by name OR email, for the
// invite picker. Deliberately returns only id/name/image — never the email —
// so the directory can be searched without harvesting email addresses. The
// board owner (and only the owner) may search, mirroring who can invite.
export default defineEventHandler(async (event) => {
  if (event.req.method !== "GET") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  const auth = await resolveUserId(event);
  if (!auth.ok) {
    event.res.statusCode = auth.status;
    return { error: auth.error };
  }
  const userId = auth.userId;

  const query = getQuery(event);
  const boardId = query.boardId;
  const q = typeof query.q === "string" ? query.q.trim() : "";

  if (!boardId || isNaN(Number(boardId)) || Number(boardId) <= 0) {
    event.res.statusCode = 400;
    return { error: "Invalid board ID" };
  }

  try {
    const db = setupDatabase();

    const [boardRows] = await db.query("SELECT * FROM boards WHERE id = ?", [
      boardId,
    ]);
    const board = boardRows[0];
    if (!board) {
      // Generic error to prevent board enumeration.
      event.res.statusCode = 404;
      return { error: "Resource not found" };
    }
    if (board.user !== userId) {
      event.res.statusCode = 403;
      return { error: "Unauthorized access" };
    }

    // Exclude the owner and anyone already invited to this board.
    let sql =
      "SELECT id, name, image, email FROM `user` " +
      "WHERE id != ? AND id NOT IN (SELECT user FROM invitations WHERE board = ?)";
    const params: any[] = [userId, boardId];

    if (q) {
      sql += " AND (name LIKE ? OR email LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like);
    }
    sql += " ORDER BY name LIMIT 20";

    const [rows] = await db.query(sql, params);
    // Return only a masked email — the raw address never leaves the server.
    const users = (rows as any[]).map((u) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      emailMasked: maskEmail(u.email),
    }));
    return { users };
  } catch (error) {
    logger.error("User search error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
