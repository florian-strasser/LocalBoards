// Areas snap into place as the board scrolls horizontally, so the one you land
// on is always at the same inset as the header's own logo — never half-cut-off
// against the edge of the window.
//
// The interesting risk is not the snapping itself but what it does to
// SortableJS's autoscroll: dragging an area or a card near the screen edge
// reaches an off-screen neighbour by nudging `scrollLeft` in small steps
// (sortablejs's own `scrollBy()` is `el.scrollLeft += x`), and a mandatory
// snap resettles the container to its *current* point on every one of those
// writes — the nudges never add up to anything and the drag looks stuck. This
// checks the alignment the feature is for, and separately reproduces that
// exact mechanism to confirm the fix (suspending the snap for the length of
// any drag) actually unsticks it.
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
const DB = "lokalboards_scrollsnap", PORT = 3100, BASE = `http://127.0.0.1:${PORT}`;
const creds = { host: env.NUXT_MYSQL_HOST, user: env.NUXT_MYSQL_USER, password: env.NUXT_MYSQL_PASSWORD };

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
};

const admin = await mysql.createConnection(creds);
await admin.query(`DROP DATABASE IF EXISTS \`${DB}\``);
await admin.query(`CREATE DATABASE \`${DB}\``);
await admin.end();

const child = spawn("node", [".output/server/index.mjs"], {
  env: { ...process.env, ...env, NUXT_MYSQL_DATABASE: DB, NUXT_MYSQL_SSL: "false", PORT: String(PORT),
         NITRO_PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_LOG_LEVEL: "error", NUXT_LANGUAGE: "en" },
  stdio: ["ignore", "pipe", "pipe"],
});
for (let i = 0; i < 160; i++) {
  try { if ((await fetch(BASE + "/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
const c = await mysql.createConnection({ ...creds, database: DB });
for (let i = 0; i < 200; i++) {
  const [r] = await c.query("SELECT 1 FROM `migrations` WHERE `id` LIKE '0024%'").catch(() => [[]]);
  if (r.length) break;
  await new Promise((r) => setTimeout(r, 250));
}

await fetch(`${BASE}/api/auth/sign-up`, { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Owner", email: "owner@example.test", password: "correct horse battery" }) });
const signIn = await fetch(`${BASE}/api/auth/sign-in`, { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "owner@example.test", password: "correct horse battery" }) });
const cookie = (signIn.headers.getSetCookie?.() ?? []).map((x) => x.split(";")[0]).find((x) => x.startsWith("session_token="));
await c.execute("UPDATE `user` SET `onboarded` = 1");
const [[user]] = await c.query("SELECT id FROM `user` LIMIT 1");
const [board] = await c.execute("INSERT INTO `boards` (user, name, status) VALUES (?,?,?)", [user.id, "Snap", "private"]);
for (let i = 0; i < 6; i++) {
  await c.execute("INSERT INTO `areas` (board, name, sort) VALUES (?,?,?)", [board.insertId, `Area ${i + 1}`, i]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
await page.context().addCookies([{ name: cookie.split("=")[0], value: cookie.split("=").slice(1).join("="),
  domain: "127.0.0.1", path: "/" }]);
await page.goto(`${BASE}/board/${board.insertId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const scroller = page.locator('[class*="overflow-x-auto"]').first();
const logoLeft = () => page.evaluate(() =>
  Math.round(document.querySelector("header a, header img").getBoundingClientRect().left));
const areaLefts = () => page.evaluate(() =>
  [...document.querySelectorAll("[data-onboarding='areas'] > div")].map((a) => Math.round(a.getBoundingClientRect().left)));

console.log("\n1. at rest, the first area already lines up with the header logo");
check("same left edge", (await areaLefts())[0] === (await logoLeft()));

console.log("\n2. an arbitrary partial scroll settles on a real snap point");
await scroller.evaluate((el) => { el.scrollLeft = 300; }); // not a clean multiple of any column width
await page.waitForTimeout(900);
const logo = await logoLeft();
const areas = await areaLefts();
check("some area's left edge lands exactly on the logo's", areas.includes(logo), JSON.stringify({ logo, areas }));

console.log("\n3. scrolling to the very end reaches the last column cleanly");
await scroller.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
await page.waitForTimeout(900);
const atEnd = await scroller.evaluate((el) => el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
check("the final column (create-area) is fully in view", atEnd);

console.log("\n4. the mechanism drag-autoscroll relies on is not fought by the snap");
// sortablejs's own scrollBy() is exactly `el.scrollLeft += x` — this reproduces
// that call pattern directly rather than trying to synthesize a native drag
// gesture, which automation cannot reliably do for this library.
const nudgeLoop = () => page.evaluate(async () => {
  const el = document.querySelector('[class*="overflow-x-auto"]');
  el.scrollLeft = 0;
  await new Promise((r) => setTimeout(r, 50));
  for (let i = 0; i < 25; i++) {
    el.scrollLeft += 15;
    await new Promise((r) => setTimeout(r, 16));
  }
  return el.scrollLeft;
});
const stuck = await nudgeLoop();
check("with the snap active, tiny steps alone go nowhere (the bug this guards)", stuck === 0, String(stuck));

await page.evaluate(() => {
  document.querySelector('[class*="overflow-x-auto"]').classList.remove("snap-x", "snap-mandatory");
});
const freed = await nudgeLoop();
check("with the snap suspended — what a live drag does — the same steps add up", freed === 375, String(freed));

await browser.close();
child.kill("SIGKILL");
const cleanup = await mysql.createConnection(creds);
await cleanup.query(`DROP DATABASE IF EXISTS \`${DB}\``);
await cleanup.end();
await c.end();

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures ? 1 : 0);
