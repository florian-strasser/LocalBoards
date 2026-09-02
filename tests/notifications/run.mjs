// Images inside a notification, after the WebP conversion.
//
// A comment notification stores a copy of the comment: `New comment by "X" on
// card "Y": <the comment's HTML>`. Migration 0023 converted the uploads named by
// boards, cards and comments — but it never looked at `notifications`, so a
// notification kept pointing at the original file, and the same migration then
// deleted that file because nothing it knew about named it any more. The picture
// in the bell went missing while the one in the comment was fine.
//
// Requires a built app (`npm run build`) and the credentials in `.env.local`.
// Creates and drops a database of its own; it never touches an existing one.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import mysql from "mysql2/promise";
import sharp from "sharp";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const DB = "lokalboards_notifications", PORT = 3100, BASE = `http://127.0.0.1:${PORT}`;
const creds = { host: env.NUXT_MYSQL_HOST, user: env.NUXT_MYSQL_USER, password: env.NUXT_MYSQL_PASSWORD };
const uploads = path.join(process.cwd(), "public", "uploads");

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
};

const admin = await mysql.createConnection(creds);
await admin.query(`DROP DATABASE IF EXISTS \`${DB}\``); await admin.query(`CREATE DATABASE \`${DB}\``); await admin.end();

let child;
const startServer = () => {
  child = spawn("node", [".output/server/index.mjs"], {
    env: { ...process.env, ...env, NUXT_MYSQL_DATABASE: DB, NUXT_MYSQL_SSL: "false", PORT: String(PORT),
           NITRO_PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_LANGUAGE: "en" },
    stdio: ["ignore", "pipe", "pipe"] });
  for (const s of [child.stdout, child.stderr]) {
    s.on("data", (d) => String(d).split("\n").forEach((line) => {
      if (/warn|error/i.test(line) && line.trim()) console.log("   [server]", line.slice(0, 180));
    }));
  }
};
const stopServer = () => new Promise((r) => { child.once("exit", r); child.kill("SIGTERM"); setTimeout(r, 4000); });
const waitForPort = async () => { for (let i = 0; i < 160; i++) { try { if ((await fetch(BASE + "/")).ok) return; } catch {} await new Promise(r => setTimeout(r, 250)); } };
const waitForMigration = async (c, id, ms = 90000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const [rows] = await c.execute("SELECT 1 FROM `migrations` WHERE `id` = ?", [id]);
    if (rows.length) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};

startServer(); await waitForPort();
const c = await mysql.createConnection({ ...creds, database: DB });
await waitForMigration(c, "0023_convert_remaining_images_to_webp");

// A board, a card and a photograph pasted into a comment, as it was in July.
await fetch(`${BASE}/api/auth/sign-up`, { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Owner", email: "owner@example.test", password: "correct horse battery" }) });
const [[user]] = await c.query("SELECT id FROM `user` LIMIT 1");
const [board] = await c.execute("INSERT INTO `boards` (user, name, status) VALUES (?,?,?)", [user.id, "Notify", "private"]);
const [area] = await c.execute("INSERT INTO `areas` (board, name, sort) VALUES (?,?,?)", [board.insertId, "Todo", 0]);
const [card] = await c.execute("INSERT INTO `cards` (area, name, content, sort) VALUES (?,?,?,?)", [area.insertId, "A card", "", 0]);

const legacy = "julyphoto0000000000000000000.jpeg";
await fs.promises.mkdir(uploads, { recursive: true });
await fs.promises.writeFile(path.join(uploads, legacy),
  await sharp({ create: { width: 900, height: 600, channels: 3, background: { r: 40, g: 90, b: 160 } } })
    .jpeg({ quality: 95 }).toBuffer());

const body = `<p>Look at this</p><img src="/api/uploads/${legacy}">`;
await c.execute("INSERT INTO `comments` (card, user, content) VALUES (?,?,?)", [card.insertId, user.id, body]);
await c.execute(
  "INSERT INTO `notifications` (userId, type, boardId, cardId, message) VALUES (?,?,?,?,?)",
  [user.id, "comment", board.insertId, card.insertId, `New comment by "Owner" on card "A card": ${body}`]);

// Re-run the conversion over data that now includes a notification.
await c.execute("DELETE FROM `migrations` WHERE `id` = '0023_convert_remaining_images_to_webp'");
await stopServer(); startServer(); await waitForPort();
await waitForMigration(c, "0023_convert_remaining_images_to_webp");
await waitForMigration(c, "0024_convert_notification_images_to_webp").catch(() => {});

const named = (text) => [...String(text || "").matchAll(/\/(?:api\/)?uploads\/([A-Za-z0-9._-]+)/g)].map((m) => m[1]);
const [[comment]] = await c.query("SELECT content FROM `comments` LIMIT 1");
const [[note]] = await c.query("SELECT message FROM `notifications` LIMIT 1");
const commentFile = named(comment.content)[0];
const noteFile = named(note.message)[0];
const exists = (f) => f && fs.existsSync(path.join(uploads, f));

console.log("\n1. the comment itself was converted");
check("it points at a .webp", commentFile?.endsWith(".webp"), commentFile);
check("and that file is on disk", exists(commentFile), commentFile);

console.log("\n2. the notification's copy points at a file that is really there");
check("not the deleted original", noteFile !== legacy, noteFile);
check("the file exists", exists(noteFile), `${noteFile} ${exists(noteFile) ? "" : "is missing"}`);
check("and it is the same picture the comment shows", noteFile === commentFile, `${noteFile} vs ${commentFile}`);

console.log("\n3. nothing else in the message was disturbed");
check("the text around it survived", /New comment by "Owner" on card "A card": <p>Look at this<\/p>/.test(note.message),
  note.message.slice(0, 70) + "…");

// An instance that already ran the first version of 0023 cannot be helped by
// fixing that migration — it is recorded as done. This is that instance: the
// comment carries the converted name, the notification still carries the old
// one, and the old file is gone. 0024 has to put it right from the comment.
console.log("\n4. an instance already damaged is repaired from the comment");
const gone = "deletedjuly000000000000000000.jpeg";
const kept = "keptjuly00000000000000000000.webp";
await fs.promises.writeFile(path.join(uploads, kept),
  await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .webp().toBuffer());
const [card2] = await c.execute("INSERT INTO `cards` (area, name, content, sort) VALUES (?,?,?,?)", [area.insertId, "Second", "", 1]);
await c.execute("INSERT INTO `comments` (card, user, content) VALUES (?,?,?)",
  [card2.insertId, user.id, `<p>July photo</p><img src="/api/uploads/${kept}">`]);
const [stale] = await c.execute(
  "INSERT INTO `notifications` (userId, type, boardId, cardId, message) VALUES (?,?,?,?,?)",
  [user.id, "comment", board.insertId, card2.insertId,
   `New comment by "Owner" on card "Second": <p>July photo</p><img src="/api/uploads/${gone}">`]);
// One that nothing can be matched to: it must be left exactly as it is.
const [orphan] = await c.execute(
  "INSERT INTO `notifications` (userId, type, boardId, cardId, message) VALUES (?,?,?,?,?)",
  [user.id, "comment", board.insertId, null,
   `New comment by "Owner" on card "Lost": <img src="/api/uploads/${gone}">`]);

await c.execute("DELETE FROM `migrations` WHERE `id` = '0024_repair_notification_images'");
await stopServer(); startServer(); await waitForPort();
check("the repair ran", await waitForMigration(c, "0024_repair_notification_images"), "0024");

const [[fixed]] = await c.query("SELECT message FROM `notifications` WHERE id = ?", [stale.insertId]);
const fixedFile = named(fixed.message)[0];
check("the notification names the file the comment names", fixedFile === kept, `${fixedFile} vs ${kept}`);
check("and that file is on disk", exists(fixedFile), fixedFile);
check("its text is untouched", /New comment by "Owner" on card "Second": <p>July photo<\/p>/.test(fixed.message),
  fixed.message.slice(0, 60) + "…");

const [[left]] = await c.query("SELECT message FROM `notifications` WHERE id = ?", [orphan.insertId]);
check("one that cannot be matched is left alone, not mangled", named(left.message)[0] === gone, named(left.message)[0]);

for (const f of [legacy, commentFile, noteFile, kept]) { try { await fs.promises.unlink(path.join(uploads, f)); } catch {} }
await stopServer();
const cleanup = await mysql.createConnection(creds); await cleanup.query(`DROP DATABASE IF EXISTS \`${DB}\``); await cleanup.end(); await c.end();
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures ? 1 : 0);
