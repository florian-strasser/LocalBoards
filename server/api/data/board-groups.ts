import { defineEventHandler, readBody } from "h3";
import { setupDatabase } from "../../../app/lib/databaseSetup";

// The caller's own board groups. Every operation is scoped to the caller, so a
// user can only ever see and change their own groups — including for boards
// shared with them.
//
//   GET    → list the caller's groups (ordered)
//   POST   → create a group { name } at the end
//   PATCH  → update the caller's group { id, name?, collapsed? }
//   DELETE → remove the caller's group { id }; its boards fall back to ungrouped
export default defineEventHandler(async (event) => {
  const auth = await resolveUserId(event);
  if (!auth.ok) {
    event.res.statusCode = auth.status;
    return { error: auth.error };
  }
  const userId = auth.userId;
  const db = setupDatabase();
  const method = event.req.method;

  try {
    if (method === "GET") {
      const [rows]: any = await db.execute(
        "SELECT id, name, sort, collapsed FROM `board_groups` WHERE `user` = ? ORDER BY sort, id",
        [userId],
      );
      return {
        groups: rows.map((g: any) => ({
          id: g.id,
          name: g.name,
          sort: g.sort,
          collapsed: !!g.collapsed,
        })),
      };
    }

    if (method === "POST") {
      const body = await readBody(event).catch(() => null);
      const name = (body?.name ?? "").toString().trim();
      if (!name || name.length > 255) {
        event.res.statusCode = 400;
        return { error: "INVALID_NAME" };
      }
      // Append after the caller's existing groups.
      const [[max]]: any = await db.query(
        "SELECT COALESCE(MAX(sort), -1) + 1 AS nextSort FROM `board_groups` WHERE `user` = ?",
        [userId],
      );
      const [result]: any = await db.execute(
        "INSERT INTO `board_groups` (`user`, `name`, `sort`) VALUES (?, ?, ?)",
        [userId, name, max.nextSort],
      );
      return {
        group: { id: result.insertId, name, sort: max.nextSort, collapsed: false },
      };
    }

    if (method === "PATCH") {
      const body = await readBody(event).catch(() => null);
      const id = Number(body?.id);
      if (!Number.isInteger(id) || id <= 0) {
        event.res.statusCode = 400;
        return { error: "INVALID_ID" };
      }
      const fields: string[] = [];
      const values: any[] = [];
      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name || name.length > 255) {
          event.res.statusCode = 400;
          return { error: "INVALID_NAME" };
        }
        fields.push("name = ?");
        values.push(name);
      }
      if (body.collapsed !== undefined) {
        fields.push("collapsed = ?");
        values.push(body.collapsed ? 1 : 0);
      }
      if (fields.length === 0) {
        event.res.statusCode = 400;
        return { error: "NOTHING_TO_UPDATE" };
      }
      // The `user = ?` clause makes this the ownership check.
      const [result]: any = await db.execute(
        `UPDATE \`board_groups\` SET ${fields.join(", ")} WHERE id = ? AND \`user\` = ?`,
        [...values, id, userId],
      );
      if (!result.affectedRows) {
        event.res.statusCode = 404;
        return { error: "NOT_FOUND" };
      }
      return { ok: true };
    }

    if (method === "DELETE") {
      const body = await readBody(event).catch(() => null);
      const id = Number(body?.id);
      if (!Number.isInteger(id) || id <= 0) {
        event.res.statusCode = 400;
        return { error: "INVALID_ID" };
      }
      const [result]: any = await db.execute(
        "DELETE FROM `board_groups` WHERE id = ? AND `user` = ?",
        [id, userId],
      );
      if (!result.affectedRows) {
        event.res.statusCode = 404;
        return { error: "NOT_FOUND" };
      }
      // The group's boards aren't lost — they drop back to ungrouped.
      await db.execute(
        "UPDATE `board_placements` SET `group` = NULL WHERE `group` = ? AND `user` = ?",
        [id, userId],
      );
      return { ok: true };
    }

    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  } catch (error) {
    logger.error("Board groups error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
