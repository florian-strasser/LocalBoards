// Where an area's list starts, and whether an empty one can still be dropped on.
//
// The list of cards sits in an inner wrapper with `p-1` — room for the unread
// marker, which is a ring drawn outside a card and was being clipped by the
// scroll container. That padding pushed the first card down by 4px, and in an
// area with no cards it became 8px of empty padding between the header and the
// "create a card" form, so a column with cards and a column without no longer
// lined up. The wrapper gives the top back and the padding is dropped when
// there is nothing to pad — but an empty area still has to be a drop target,
// which is what the drag below checks.
//
// Requires a built app (`npm run build`) and the credentials in `.env.local`.
// Creates and drops a database of its own; it never touches an existing one.
import fs from "node:fs";
import { spawn } from "node:child_process";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const DB = "lokalboards_layout";
const PORT = 3100, BASE = `http://127.0.0.1:${PORT}`;
const creds = { host: env.NUXT_MYSQL_HOST, user: env.NUXT_MYSQL_USER, password: env.NUXT_MYSQL_PASSWORD };

const admin = await mysql.createConnection(creds);
await admin.query(`DROP DATABASE IF EXISTS \`${DB}\``);
await admin.query(`CREATE DATABASE \`${DB}\``);
await admin.end();

const child = spawn("node", [".output/server/index.mjs"], {
  env: { ...process.env, ...env, NUXT_MYSQL_DATABASE: DB, NUXT_MYSQL_SSL: "false",
         PORT: String(PORT), NITRO_PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_LOG_LEVEL: "error" },
  stdio: ["ignore", "pipe", "pipe"],
});
for (let i = 0; i < 120; i++) {
  try { if ((await fetch(BASE + "/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
const c = await mysql.createConnection({ ...creds, database: DB });
for (let i = 0; i < 100; i++) {
  const [r] = await c.query("SELECT 1 FROM `migrations` WHERE `id` LIKE '0023%'").catch(() => [[]]);
  if (r.length) break;
  await new Promise((r) => setTimeout(r, 200));
}

await fetch(`${BASE}/api/auth/sign-up`, { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Owner", email: "owner@example.test", password: "correct horse battery" }) });
const signIn = await fetch(`${BASE}/api/auth/sign-in`, { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "owner@example.test", password: "correct horse battery" }) });
const cookie = (signIn.headers.getSetCookie?.() ?? []).map((x) => x.split(";")[0]).find((x) => x.startsWith("session_token="));
const [[user]] = await c.query("SELECT id FROM `user` LIMIT 1");

const [board] = await c.execute("INSERT INTO `boards` (user, name, status) VALUES (?,?,?)", [user.id, "Layout", "private"]);
const boardId = board.insertId;
const [a1] = await c.execute("INSERT INTO `areas` (board, name, sort) VALUES (?,?,?)", [boardId, "Empty", 0]);
const [a2] = await c.execute("INSERT INTO `areas` (board, name, sort) VALUES (?,?,?)", [boardId, "Full", 1]);
for (let i = 0; i < 3; i++) {
  await c.execute("INSERT INTO `cards` (area, name, content, sort) VALUES (?,?,?,?)",
    [a2.insertId, `Card ${i + 1}`, "", i]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.context().addCookies([{ name: cookie.split("=")[0], value: cookie.split("=").slice(1).join("="),
  domain: "127.0.0.1", path: "/" }]);
await page.goto(`${BASE}/board/${boardId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
// Open the new-card form in the empty area.
await page.locator("button", { hasText: /Neue Karte|New card|Create/i }).first().click();
await page.waitForTimeout(800);

const probe = await page.evaluate(() => {
  const areas = [...document.querySelectorAll('[data-area-id]')].map((w) => w.closest('.rounded-lg'));
  const y = (el) => el ? Math.round(el.getBoundingClientRect().top) : null;
  const bot = (el) => el ? Math.round(el.getBoundingClientRect().bottom) : null;
  return areas.map((col) => {
    const header = col.querySelector('.flex.justify-between');
    const wrapper = col.querySelector('[data-area-id]');
    const firstCard = wrapper.querySelector('[data-area-id] > div > *');
    const form = col.querySelector('textarea') || col.querySelector('form') ;
    const button = col.querySelector('button:last-of-type');
    return {
      name: col.querySelector('input')?.value,
      headerBottom: bot(header),
      wrapperTop: y(wrapper), wrapperHeight: Math.round(wrapper.getBoundingClientRect().height),
      firstCardTop: y(firstCard),
      formTop: y(form),
      firstThingTop: y(firstCard) ?? y(form),
    };
  });
});
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
};

console.log("\n1. both areas start their contents in the same place");
const gaps = probe.map((p) => p.firstThingTop - p.headerBottom);
check("the area with cards", gaps[1] === 4, `${gaps[1]}px below its header`);
check("the empty one, showing its form", gaps[0] === 4, `${gaps[0]}px below its header`);
check("so the two line up", gaps[0] === gaps[1], gaps.join(" vs "));
check("and an empty list takes no room", probe[0].wrapperHeight === 0,
  `${probe[0].wrapperHeight}px`);

console.log("\n2. an empty area is still somewhere to drop a card");
if (process.argv[2]) {
  await page.screenshot({ path: process.argv[2] + "/board-align.png", clip: { x: 0, y: 100, width: 900, height: 400 } });
}

// Can a card be dragged into the empty area as things stand?
const card = page.locator('[data-area-id]').nth(1).locator('> div > *').first();
const target = page.locator('[data-area-id]').nth(0);
const from = await card.boundingBox();
const to = await target.boundingBox();
await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
await page.mouse.down();
await page.mouse.move(from.x + from.width / 2, from.y + 20, { steps: 5 });
await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 1, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(1200);
const counts = await page.evaluate(() =>
  [...document.querySelectorAll('[data-area-id]')].map((w) => w.querySelectorAll(':scope > div > *').length));
check("the card landed there", counts[0] === 1, `cards per area: ${counts.join(", ")}`);
check("and left the area it came from", counts[1] === 2, `cards per area: ${counts.join(", ")}`);

// The state the drop leaves behind, with no reload. SortableJS moves the card's
// element itself and never touches the array the template renders from, so
// anything keyed off that array is stale here — which is how a just-dropped card
// came out 8px wider than its column and 4px too high.
console.log("\n3. the dropped card looks like every other card, before any reload");
const dropped = await page.evaluate(() => {
  const lists = [...document.querySelectorAll('[data-area-id]')];
  const box = (el) => { const b = el.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width), top: Math.round(b.top) }; };
  const read = (i) => {
    const col = lists[i].closest('.rounded-lg');
    const card = lists[i].querySelector(':scope > div > *');
    return {
      card: box(card),
      column: box(col),
      // What the column itself says its contents should be inset by.
      columnPadding: Math.round(parseFloat(getComputedStyle(col).paddingLeft)),
      gap: box(card).top - Math.round(col.querySelector('.flex.justify-between').getBoundingClientRect().bottom),
    };
  };
  return { moved: read(0), untouched: read(1) };
});
// Measured against the column rather than against the other card: with the
// padding missing everywhere, the two cards match each other and prove nothing.
for (const [what, m] of [["the dropped card", dropped.moved], ["a card nobody moved", dropped.untouched]]) {
  check(`${what} is inset by the column's own padding`,
    m.card.left - m.column.left === m.columnPadding && m.column.right - m.card.right === m.columnPadding,
    `${m.card.left - m.column.left}px / ${m.column.right - m.card.right}px, column pads ${m.columnPadding}px`);
  check(`${what} sits 4px under its heading`, m.gap === 4, `${m.gap}px`);
}
check("and the two are the same width", dropped.moved.card.width === dropped.untouched.card.width,
  `${dropped.moved.card.width}px vs ${dropped.untouched.card.width}px`);
await browser.close();
child.kill("SIGKILL");
const cleanup = await mysql.createConnection(creds);
await cleanup.query(`DROP DATABASE IF EXISTS \`${DB}\``);
await cleanup.end();
await c.end();

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures ? 1 : 0);
