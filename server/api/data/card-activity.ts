import { defineEventHandler, getQuery } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

// GET /api/data/card-activity?cardId=123
// The card's own history — who changed what, and when. Requires read access to
// the board the card belongs to, so a card's history is never visible to
// someone who can't see the card.
export default defineEventHandler(async (event) => {
  if (event.req.method !== "GET") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  const cardId = getQuery(event).cardId;
  if (!cardId || isNaN(Number(cardId)) || Number(cardId) <= 0) {
    event.res.statusCode = 400;
    return { error: "Invalid card ID" };
  }

  const db = setupDatabase();

  try {
    // Resolve the card's board first, then run the normal access check on it.
    const [[row]]: any = await db.query(
      "SELECT a.board AS boardId FROM cards c JOIN areas a ON a.id = c.area WHERE c.id = ?",
      [cardId],
    );
    if (!row) {
      event.res.statusCode = 404;
      return { error: "Resource not found" };
    }

    const auth = await requireBoardAccess(event, row.boardId, "read");
    if (!auth.ok) {
      event.res.statusCode = auth.status;
      return { error: auth.error };
    }

    // Join the actor so the timeline can show an avatar, and resolve an
    // assignee id in `data` to a name so the client doesn't have to.
    const [rows]: any = await db.execute(
      `SELECT ca.id, ca.type, ca.data, ca.createdAt,
              ca.actorId, u.name AS actorName, u.image AS actorImage, u.type AS actorType
         FROM card_activity ca
         LEFT JOIN \`user\` u ON u.id = ca.actorId
        WHERE ca.card = ?
        ORDER BY ca.createdAt ASC, ca.id ASC`,
      [cardId],
    );

    const activity = rows.map((r: any) => {
      let data: any = null;
      try {
        data = r.data ? JSON.parse(r.data) : null;
      } catch {
        data = null;
      }
      return {
        id: r.id,
        type: r.type,
        data,
        createdAt: r.createdAt,
        actorId: r.actorId,
        actorName: r.actorName,
        actorImage: r.actorImage,
        actorType: r.actorType,
      };
    });

    // Resolve assignee ids referenced in the payloads to display names.
    const assigneeIds = [
      ...new Set(
        activity
          .map((a: any) => a.data?.assigneeId)
          .filter((v: any) => typeof v === "string" && v),
      ),
    ];
    if (assigneeIds.length > 0) {
      const ph = assigneeIds.map(() => "?").join(",");
      const [users]: any = await db.execute(
        `SELECT id, name FROM \`user\` WHERE id IN (${ph})`,
        assigneeIds,
      );
      const nameById = new Map(users.map((u: any) => [u.id, u.name]));
      for (const a of activity) {
        if (a.data?.assigneeId) {
          a.data.assigneeName = nameById.get(a.data.assigneeId) ?? null;
        }
      }
    }

    return { activity };
  } catch (error) {
    logger.error("Card activity error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
