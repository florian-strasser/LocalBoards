// Images the app renders itself are stored as WebP, and a profile picture is
// bounded to the size it is drawn at. Attachments are deliberately left alone.
//
// Also checks the migration that points existing placeholder picks at the WebP
// files that replaced the PNGs.
import { chromium } from "playwright";
import mysql from "mysql2/promise";
import sharp from "sharp";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const db = () => mysql.createConnection({
  host: env.NUXT_MYSQL_HOST, user: env.NUXT_MYSQL_USER,
  password: env.NUXT_MYSQL_PASSWORD, database: env.NUXT_MYSQL_DATABASE,
});

const PORT = Number(process.env.IMAGE_TEST_PORT || 3134);
const BASE = `http://127.0.0.1:${PORT}`;
try {
  await fetch(BASE + "/", { signal: AbortSignal.timeout(1500) });
  console.error(`something is already listening on ${PORT}; stop it first`);
  process.exit(1);
} catch {}

const sweep = async () => {
  const c = await db();
  await c.execute("DELETE FROM attachments WHERE card IN (SELECT id FROM cards WHERE area IN (SELECT id FROM areas WHERE board IN (SELECT id FROM boards WHERE name = 'image-test')))");
  await c.execute("DELETE FROM comments WHERE card IN (SELECT id FROM cards WHERE area IN (SELECT id FROM areas WHERE board IN (SELECT id FROM boards WHERE name = 'image-test')))");
  await c.execute("DELETE FROM cards WHERE area IN (SELECT id FROM areas WHERE board IN (SELECT id FROM boards WHERE name = 'image-test'))");
  await c.execute("DELETE FROM areas WHERE board IN (SELECT id FROM boards WHERE name = 'image-test')");
  await c.execute("DELETE FROM boards WHERE name = 'image-test'");
  for (const t of ["session", "account"]) {
    await c.execute(`DELETE FROM \`${t}\` WHERE userId IN (SELECT id FROM \`user\` WHERE email LIKE '%@example.test')`);
  }
  await c.execute("DELETE FROM `user` WHERE email LIKE '%@example.test'");
  await c.end();
};
await sweep();

const watchServer = (proc) => {
  for (const stream of [proc.stdout, proc.stderr]) {
    stream?.on("data", (d) => {
      for (const line of String(d).split("\n")) {
        if (/warn|error/i.test(line) && !/email/i.test(line)) console.log("   [server]", line.slice(0, 200));
      }
    });
  }
  return proc;
};
let child = watchServer(spawn("node", [".output/server/index.mjs"], {
  env: { ...process.env, ...env, PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_MYSQL_SSL: "false", NUXT_PUBLIC_SIGNUP: "true" },
  stdio: ["ignore", "pipe", "pipe"],
}));
for (let i = 0; i < 160; i++) {
  try { if ((await fetch(BASE + "/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 250));
}

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
};

const c = await db();

// The server answers before its migrations have finished, and this one re-encodes
// images — so waiting for the port says nothing about whether it has run. Wait
// for the migration to record itself instead.
// Generous: on a database with a lot of stored pictures the conversion is
// minutes of work, and a wait that expires first reports a migration as broken
// when it is only busy.
const waitForMigration = async (id, ms = 600000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const [rows] = await c.execute("SELECT 1 FROM `migrations` WHERE `id` = ?", [id]);
    if (rows.length) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};

await fetch(`${BASE}/api/auth/sign-up`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Owner", email: "owner@example.test", password: "correct horse battery" }),
});
const signIn = await fetch(`${BASE}/api/auth/sign-in`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "owner@example.test", password: "correct horse battery" }),
});
const cookie = (signIn.headers.getSetCookie?.() ?? []).map((x) => x.split(";")[0])
  .find((x) => x.startsWith("session_token="));

// A deliberately oversized photograph, the shape of a phone camera's output.
const huge = await sharp({
  create: { width: 3000, height: 2000, channels: 3, background: { r: 180, g: 90, b: 40 } },
}).jpeg({ quality: 95 }).toBuffer();

const upload = async (buffer, { purpose, filename = "photo.jpg", type = "image/jpeg", field = "file" } = {}) => {
  const form = new FormData();
  form.append(field, new Blob([buffer], { type }), filename);
  if (purpose) form.append("purpose", purpose);
  const res = await fetch(`${BASE}/api/upload/image`, { method: "POST", headers: { cookie }, body: form });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};
const stored = (url) => path.join(process.cwd(), "public", "uploads", url.split("/").pop());

console.log("\n1. a profile picture is re-encoded and bounded");
const avatar = await upload(huge, { purpose: "avatar" });
check("accepted", avatar.status === 200 && avatar.body.imageUrl, `status ${avatar.status}`);
check("stored as .webp", avatar.body.imageUrl?.endsWith(".webp"), avatar.body.imageUrl);
const avatarMeta = await sharp(stored(avatar.body.imageUrl)).metadata();
check("the file really is WebP", avatarMeta.format === "webp", avatarMeta.format);
check("no wider than 144px", avatarMeta.width === 144, `${avatarMeta.width}x${avatarMeta.height}`);
check("aspect ratio kept", Math.abs(avatarMeta.height - 96) <= 1, `${avatarMeta.height}px tall`);
check("and much smaller than what was sent",
  avatar.body.size < huge.length / 5, `${Math.round(huge.length / 1024)}KB → ${Math.round(avatar.body.size / 1024)}KB`);

console.log("\n2. an image pasted into a card or comment is re-encoded, not resized");
const pasted = await upload(huge, { field: "image" });
const pastedMeta = await sharp(stored(pasted.body.imageUrl)).metadata();
check("stored as .webp", pasted.body.imageUrl?.endsWith(".webp"), pasted.body.imageUrl);
check("keeps its dimensions", pastedMeta.width === 3000 && pastedMeta.height === 2000,
  `${pastedMeta.width}x${pastedMeta.height}`);
check("and is smaller than the JPEG", pasted.body.size < huge.length,
  `${Math.round(huge.length / 1024)}KB → ${Math.round(pasted.body.size / 1024)}KB`);

console.log("\n3. a small picture is not enlarged to fill the bound");
const tiny = await sharp({ create: { width: 40, height: 40, channels: 3, background: { r: 0, g: 120, b: 220 } } })
  .png().toBuffer();
const small = await upload(tiny, { purpose: "avatar", filename: "tiny.png", type: "image/png" });
const smallMeta = await sharp(stored(small.body.imageUrl)).metadata();
check("left at its own size", smallMeta.width === 40, `${smallMeta.width}px`);

console.log("\n4. something that is not an image is still refused");
const notAnImage = await upload(Buffer.from("这不是图片 not an image at all"), { filename: "x.png", type: "image/png" });
check("rejected", notAnImage.status === 400, `status ${notAnImage.status}`);

console.log("\n5. the placeholders that ship with the app are WebP");
const files = fs.readdirSync(path.join(process.cwd(), "public", "images"));
check("no PNG left behind", !files.some((f) => f.endsWith(".png")), files.filter((f) => f.endsWith(".png")).join(", "));
check("fourteen WebP placeholders", files.filter((f) => f.endsWith(".webp")).length === 14, `${files.length} files`);
for (const name of ["profile_placeholder_01.webp", "board_placeholder_01.webp"]) {
  const meta = await sharp(path.join(process.cwd(), "public", "images", name)).metadata();
  check(`${name} is really WebP`, meta.format === "webp", meta.format);
}

console.log("\n6. an old placeholder pick is pointed at the WebP by the migration");
const [[owner]] = await c.execute("SELECT id FROM `user` WHERE email = 'owner@example.test'");
await c.execute("UPDATE `user` SET image = '/images/profile_placeholder_03.png' WHERE id = ?", [owner.id]);
const [board] = await c.execute(
  "INSERT INTO boards (`user`, name, style, image) VALUES (?, 'image-test', 'kanban', '/images/board_placeholder_05.png')",
  [owner.id],
);
// An upload keeps its own name whatever it ends in — the migration must not
// touch it. Seeded alongside so one restart proves both.
await c.execute("INSERT INTO boards (`user`, name, style, image) VALUES (?, 'image-test', 'kanban', '/api/uploads/abc123.png')", [owner.id]);

// Drive the real migration rather than its SQL: forget that it ran, then start
// the server again, which is exactly what upgrading an existing instance does.
await c.execute("DELETE FROM `migrations` WHERE `id` = '0021_placeholder_images_to_webp'");
await new Promise((resolve) => {
  child.once("exit", resolve);
  child.kill("SIGTERM");
  setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5000);
});
const restarted = spawn("node", [".output/server/index.mjs"], {
  env: { ...process.env, ...env, PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_MYSQL_SSL: "false" },
  stdio: ["ignore", "pipe", "pipe"],
});
child = restarted;
for (let i = 0; i < 160; i++) {
  try { if ((await fetch(BASE + "/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
check("the migration ran", await waitForMigration("0021_placeholder_images_to_webp"), "0021_placeholder_images_to_webp");

const [[u]] = await c.execute("SELECT image FROM `user` WHERE id = ?", [owner.id]);
const [[b]] = await c.execute("SELECT image FROM boards WHERE id = ?", [board.insertId]);
const [[kept]] = await c.execute("SELECT image FROM boards WHERE image LIKE '/api/uploads/%'");
check("the user's picture", u.image === "/images/profile_placeholder_03.webp", u.image);
check("the board's cover", b.image === "/images/board_placeholder_05.webp", b.image);
check("an uploaded picture is left alone", kept.image === "/api/uploads/abc123.png", kept.image);
const [[recorded]] = await c.execute("SELECT COUNT(*) AS n FROM `migrations` WHERE `id` = '0021_placeholder_images_to_webp'");
check("and the migration records itself", recorded.n === 1, `${recorded.n} row(s)`);

console.log("\n8. the placeholders are actually served");
for (const name of ["profile_placeholder_01.webp", "board_placeholder_01.webp"]) {
  const res = await fetch(`${BASE}/images/${name}`);
  check(`GET /images/${name}`, res.status === 200 && res.headers.get("content-type")?.includes("webp"),
    `${res.status} ${res.headers.get("content-type")}`);
}

console.log("\n9. profile pictures uploaded before this are re-encoded too");
// A picture as it would have been stored by an older version: full size, JPEG.
const legacyName = "legacyavatar0000000000000000.jpg";
const uploadsDir = path.join(process.cwd(), "public", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
fs.writeFileSync(path.join(uploadsDir, legacyName), huge);
// A second row pointing at the same file, so the "is anything else using it"
// guard is exercised rather than assumed.
const sharedName = "sharedavatar0000000000000000.jpg";
fs.writeFileSync(path.join(uploadsDir, sharedName), huge);
await c.execute("UPDATE `user` SET image = ? WHERE id = ?", [`/api/uploads/${legacyName}`, owner.id]);
await c.execute(
  "INSERT INTO boards (`user`, name, style, image) VALUES (?, 'image-test', 'kanban', ?)",
  [owner.id, `/api/uploads/${sharedName}`],
);
await fetch(`${BASE}/api/auth/sign-up`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Second", email: "second@example.test", password: "correct horse battery" }),
});
const [[second]] = await c.execute("SELECT id FROM `user` WHERE email = 'second@example.test'");
await c.execute("UPDATE `user` SET image = ? WHERE id = ?", [`/api/uploads/${sharedName}`, second.id]);

await c.execute("DELETE FROM `migrations` WHERE `id` = '0022_shrink_existing_profile_pictures'");
await new Promise((resolve) => {
  child.once("exit", resolve);
  child.kill("SIGTERM");
  setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5000);
});
child = watchServer(spawn("node", [".output/server/index.mjs"], {
  env: { ...process.env, ...env, PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_MYSQL_SSL: "false" },
  stdio: ["ignore", "pipe", "pipe"],
}));
for (let i = 0; i < 160; i++) {
  try { if ((await fetch(BASE + "/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
check("the migration ran", await waitForMigration("0022_shrink_existing_profile_pictures"), "0022_shrink_existing_profile_pictures");

const [[migrated]] = await c.execute("SELECT image FROM `user` WHERE id = ?", [owner.id]);
check("the row points somewhere new", migrated.image !== `/api/uploads/${legacyName}`, migrated.image);
check("and at a .webp", migrated.image?.endsWith(".webp"), migrated.image);
const newMeta = await sharp(path.join(uploadsDir, migrated.image.split("/").pop())).metadata();
check("bounded to 144px", newMeta.width === 144, `${newMeta.width}x${newMeta.height}`);
check("and far smaller on disk",
  fs.statSync(path.join(uploadsDir, migrated.image.split("/").pop())).size < huge.length / 5,
  `${Math.round(huge.length / 1024)}KB → ${Math.round(fs.statSync(path.join(uploadsDir, migrated.image.split("/").pop())).size / 1024)}KB`);
check("the original is cleaned up", !fs.existsSync(path.join(uploadsDir, legacyName)));

console.log("\n10. a file something else still points at is kept");
check("the board's cover still exists", fs.existsSync(path.join(uploadsDir, sharedName)));
const [[boardStill]] = await c.execute("SELECT image FROM boards WHERE image LIKE ?", [`%${sharedName}`]);
check("and the board still points at it", !!boardStill, boardStill?.image);

console.log("\n11. running it again changes nothing");
const before11 = migrated.image;
await c.execute("DELETE FROM `migrations` WHERE `id` = '0022_shrink_existing_profile_pictures'");
await new Promise((resolve) => {
  child.once("exit", resolve);
  child.kill("SIGTERM");
  setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5000);
});
child = watchServer(spawn("node", [".output/server/index.mjs"], {
  env: { ...process.env, ...env, PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_MYSQL_SSL: "false" },
  stdio: ["ignore", "pipe", "pipe"],
}));
for (let i = 0; i < 160; i++) {
  try { if ((await fetch(BASE + "/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
check("the migration ran", await waitForMigration("0022_shrink_existing_profile_pictures"), "0022_shrink_existing_profile_pictures");
const [[after11]] = await c.execute("SELECT image FROM `user` WHERE id = ?", [owner.id]);
check("an already-small WebP is left where it is", after11.image === before11, `${before11} → ${after11.image}`);

console.log("\n12. board covers and images inside content are converted too");
// A cover, a screenshot pasted into a card description, the same picture reused
// in a comment, and one file that also backs an attachment.
const coverName = "legacycover00000000000000000.png";
const pastedName = "legacypasted0000000000000000.png";
const attachedName = "legacyattached00000000000000.png";
const png = await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 30, g: 140, b: 90 } } })
  .png().toBuffer();
for (const n of [coverName, pastedName, attachedName]) {
  fs.writeFileSync(path.join(uploadsDir, n), png);
}
const [coverBoard] = await c.execute(
  "INSERT INTO boards (`user`, name, style, image) VALUES (?, 'image-test', 'kanban', ?)",
  [owner.id, `/api/uploads/${coverName}`],
);
const [area2] = await c.execute("INSERT INTO areas (board, name, sort) VALUES (?, 'A', 0)", [coverBoard.insertId]);
const [card2] = await c.execute(
  "INSERT INTO cards (area, name, sort, content) VALUES (?, 'Has an image', 0, ?)",
  [area2.insertId, `See this:\n\n![shot](/api/uploads/${pastedName})\n`],
);
const [comment2] = await c.execute(
  "INSERT INTO comments (card, `user`, content) VALUES (?, ?, ?)",
  [card2.insertId, owner.id, `Same one again ![shot](/api/uploads/${pastedName}) and an attached one.`],
);
await c.execute(
  "INSERT INTO attachments (card, filename, filetype, filesize, filedata) VALUES (?, 'keep.png', 'image/png', ?, ?)",
  [card2.insertId, png.length, `/api/uploads/${attachedName}`],
);

await c.execute("DELETE FROM `migrations` WHERE `id` = '0023_convert_remaining_images_to_webp'");
await new Promise((resolve) => {
  child.once("exit", resolve);
  child.kill("SIGTERM");
  setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5000);
});
child = watchServer(spawn("node", [".output/server/index.mjs"], {
  env: { ...process.env, ...env, PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_MYSQL_SSL: "false" },
  stdio: ["ignore", "pipe", "pipe"],
}));
for (let i = 0; i < 160; i++) {
  try { if ((await fetch(BASE + "/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
check("the migration ran", await waitForMigration("0023_convert_remaining_images_to_webp"), "0023_convert_remaining_images_to_webp");

const [[cover]] = await c.execute("SELECT image FROM boards WHERE id = ?", [coverBoard.insertId]);
check("the board cover is a .webp now", cover.image.endsWith(".webp"), cover.image);
check("and the file behind it really is one",
  (await sharp(path.join(uploadsDir, cover.image.split("/").pop())).metadata()).format === "webp");
check("the original cover is gone", !fs.existsSync(path.join(uploadsDir, coverName)));

const [[cardRow]] = await c.execute("SELECT content FROM cards WHERE id = ?", [card2.insertId]);
const [[commentRow]] = await c.execute("SELECT content FROM comments WHERE id = ?", [comment2.insertId]);
check("the card description points at a .webp", /uploads\/[a-f0-9]+\.webp/.test(cardRow.content), cardRow.content.trim());
check("no .png reference left in it", !cardRow.content.includes(pastedName));
const newPasted = cardRow.content.match(/uploads\/([a-f0-9]+\.webp)/)?.[1];
check("the comment was rewritten to the same file", commentRow.content.includes(newPasted), newPasted);

console.log("\n13. an attachment's file is not touched");
const [[att]] = await c.execute("SELECT filedata FROM attachments WHERE filename = 'keep.png'");
check("the attachment still points at its original", att.filedata === `/api/uploads/${attachedName}`, att.filedata);
check("and that file is still there", fs.existsSync(path.join(uploadsDir, attachedName)));
check("still a PNG, as it was sent",
  (await sharp(path.join(uploadsDir, attachedName)).metadata()).format === "png");

await c.end();
await new Promise((resolve) => {
  child.once("exit", resolve);
  child.kill("SIGTERM");
  setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5000);
});
await sweep();
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures ? 1 : 0);
