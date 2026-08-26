// Reordering a card inside its own area. `newIndex` from SortableJS is the
// position the card ended up in *after* the move, so the order being described
// is "lift this card out of the list, then put it back at that index" — and
// getting that wrong in one direction only is invisible until a reload.
import { chromium } from "playwright";
import mysql from "mysql2/promise";
import { spawn } from "node:child_process";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const db = () => mysql.createConnection({
  host: env.NUXT_MYSQL_HOST, user: env.NUXT_MYSQL_USER,
  password: env.NUXT_MYSQL_PASSWORD, database: env.NUXT_MYSQL_DATABASE,
});

const PORT = Number(process.env.REORDER_TEST_PORT || 3115);
const BASE = `http://127.0.0.1:${PORT}`;

try {
  await fetch(BASE + "/", { signal: AbortSignal.timeout(1500) });
  console.error(`something is already listening on ${PORT}; stop it first`);
  process.exit(1);
} catch {}

const sweep = async () => {
  const c = await db();
  await c.execute("DELETE FROM cards WHERE area IN (SELECT id FROM areas WHERE board IN (SELECT id FROM boards WHERE name = 'reorder-test'))");
  await c.execute("DELETE FROM areas WHERE board IN (SELECT id FROM boards WHERE name = 'reorder-test')");
  await c.execute("DELETE FROM boards WHERE name = 'reorder-test'");
  for (const t of ["session", "account"]) {
    await c.execute(`DELETE FROM \`${t}\` WHERE userId IN (SELECT id FROM \`user\` WHERE email LIKE '%@example.test')`);
  }
  await c.execute("DELETE FROM `user` WHERE email LIKE '%@example.test'");
  await c.end();
};

await sweep();
const child = spawn("node", [".output/server/index.mjs"], {
  env: { ...process.env, ...env, PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_MYSQL_SSL: "false", NUXT_PUBLIC_SIGNUP: "true", NUXT_LANGUAGE: "en" },
  stdio: ["ignore", "pipe", "pipe"],
});
for (let i = 0; i < 120; i++) {
  try { if ((await fetch(BASE + "/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 250));
}

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
};

const post = (path, body, cookie) => fetch(BASE + path, {
  method: "POST",
  headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});
const sessionCookie = (res) => (res.headers.getSetCookie?.() ?? [])
  .map((c) => c.split(";")[0]).filter((c) => c.startsWith("session_token=")).pop();

const c = await db();
await post("/api/auth/sign-up", { name: "Owner", email: "owner@example.test", password: "correct horse battery" });
const [[owner]] = await c.execute("SELECT id FROM `user` WHERE email = 'owner@example.test'");
const signIn = await post("/api/auth/sign-in", { email: "owner@example.test", password: "correct horse battery" });
const cookie = sessionCookie(signIn);

const [board] = await c.execute("INSERT INTO boards (`user`, name, style) VALUES (?, 'reorder-test', 'kanban')", [owner.id]);
const [area] = await c.execute("INSERT INTO areas (board, name, sort) VALUES (?, 'Backlog', 0)", [board.insertId]);
const areaId = area.insertId;

// A, B, C, D, E at sort 0..4 — rebuilt before every case so each one starts clean.
const NAMES = ["A", "B", "C", "D", "E"];
const reseed = async () => {
  await c.execute("DELETE FROM cards WHERE area = ?", [areaId]);
  const ids = {};
  for (let i = 0; i < NAMES.length; i++) {
    const [r] = await c.execute("INSERT INTO cards (area, name, sort) VALUES (?, ?, ?)", [areaId, NAMES[i], i]);
    ids[NAMES[i]] = r.insertId;
  }
  return ids;
};
const orderNow = async () => {
  const [rows] = await c.execute("SELECT name FROM cards WHERE area = ? ORDER BY sort ASC, id ASC", [areaId]);
  return rows.map((r) => r.name).join("");
};

// Each case: which card is dragged, to which index, and the order that must result.
const CASES = [
  ["C", 4, "ABDEC", "the reported one: from the middle to the bottom"],
  ["A", 4, "BCDEA", "from the top to the bottom"],
  ["C", 0, "CABDE", "from the middle to the top"],
  ["E", 1, "AEBCD", "from the bottom to just below the top"],
  ["B", 3, "ACDBE", "one step down is still one step down"],
  ["C", 2, "ABCDE", "dropped back where it started"],
];

console.log("\n1. a card lands where it was dropped");
for (const [card, newIndex, expected, label] of CASES) {
  const ids = await reseed();
  const res = await post("/api/data/cardOrder", { cardId: ids[card], areaId, newIndex }, cookie);
  const got = await orderNow();
  check(`${label}  (${card} → ${newIndex})`, res.status === 200 && got === expected, `${got}, expected ${expected}`);
}

console.log("\n2. the sort values stay a clean sequence");
const ids = await reseed();
await post("/api/data/cardOrder", { cardId: ids.C, areaId, newIndex: 4 }, cookie);
const [sorts] = await c.execute("SELECT sort FROM cards WHERE area = ? ORDER BY sort ASC", [areaId]);
check("0..n with no gaps or repeats",
  sorts.map((r) => r.sort).join(",") === "0,1,2,3,4", sorts.map((r) => r.sort).join(","));

console.log("\n3. it refuses what it should");
const other = await c.execute("INSERT INTO areas (board, name, sort) VALUES (?, 'Elsewhere', 1)", [board.insertId]);
const [stray] = await c.execute("INSERT INTO cards (area, name, sort) VALUES (?, 'Stray', 0)", [other[0].insertId]);
const foreign = await post("/api/data/cardOrder", { cardId: stray.insertId, areaId, newIndex: 0 }, cookie);
check("a card from another area", foreign.status === 404, `status ${foreign.status}`);
const [strayRow] = await c.execute("SELECT area, sort FROM cards WHERE id = ?", [stray.insertId]);
check("and leaves it alone", strayRow[0].area === other[0].insertId && strayRow[0].sort === 0);
const anon = await post("/api/data/cardOrder", { cardId: ids.C, areaId, newIndex: 0 });
check("no session at all", anon.status === 401 || anon.status === 403, `status ${anon.status}`);

console.log("\n4. an index past the end lands the card last, not nowhere");
const ids2 = await reseed();
await post("/api/data/cardOrder", { cardId: ids2.B, areaId, newIndex: 99 }, cookie);
check("clamped to the end", (await orderNow()) === "ACDEB", await orderNow());


console.log("\n5. the move dialog puts a card where it says");
const [second] = await c.execute("INSERT INTO areas (board, name, sort) VALUES (?, 'Done', 2)", [board.insertId]);
const doneId = second.insertId;
await c.execute("INSERT INTO cards (area, name, sort) VALUES (?, 'Z', 0)", [doneId]);

const ids3 = await reseed();
const browser = await chromium.launch();
const browser2 = browser;
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([{ name: "session_token", value: cookie.split("=")[1], url: BASE }]);
const page = await ctx.newPage();

const openMove = async (cardId) => {
  await page.goto(`${BASE}/board/${board.insertId}?card=${cardId}`, { waitUntil: "load" });
  await page.locator(".card-modal button[aria-haspopup='menu']").first().click();
  await page.getByRole("button", { name: "Move card", exact: true }).first().click();
  await page.waitForTimeout(300);
};
const areaOrder = async (areaId) => {
  const [rows] = await c.execute("SELECT name FROM cards WHERE area = ? ORDER BY sort ASC, id ASC", [areaId]);
  return rows.map((r) => r.name).join("");
};

// C sits in the middle of A,B,C,D,E — send it to the top of its own area.
await openMove(ids3.C);
await page.locator(".card-modal button", { hasText: "Top" }).first().click();
await page.locator(".card-modal button", { hasText: "Move card" }).last().click();
await page.waitForTimeout(900);
check("to the top of its own area", (await areaOrder(areaId)) === "CABDE", await areaOrder(areaId));

// And to the bottom, which is the case dragging got wrong.
await openMove(ids3.C);
await page.locator(".card-modal button", { hasText: "Bottom" }).first().click();
await page.locator(".card-modal button", { hasText: "Move card" }).last().click();
await page.waitForTimeout(900);
check("to the bottom of its own area", (await areaOrder(areaId)) === "ABDEC", await areaOrder(areaId));

console.log("\n6. and into another area, after a chosen card");
await openMove(ids3.A);
await page.selectOption(".card-modal select", { label: "Done" });
await page.waitForTimeout(200);
await page.locator(".card-modal button", { hasText: "After" }).first().click();
await page.waitForTimeout(200);
await page.locator(".card-modal select").last().selectOption({ label: "Z" });
await page.locator(".card-modal button", { hasText: "Move card" }).last().click();
await page.waitForTimeout(900);
check("lands after the card it was told to follow", (await areaOrder(doneId)) === "ZA", await areaOrder(doneId));
check("and has left the area it came from", !(await areaOrder(areaId)).includes("A"), await areaOrder(areaId));

const toast = page.locator("div.fixed.bottom-8.right-8 > div");
check("it says so", (await toast.count()) >= 1, `${await toast.count()} toasts`);

console.log("\n7. on a touch screen a swipe scrolls instead of dragging");
// Enough cards that there is somewhere to scroll to.
await c.execute("DELETE FROM cards WHERE area = ?", [areaId]);
for (let i = 0; i < 24; i++) {
  await c.execute("INSERT INTO cards (area, name, sort) VALUES (?, ?, ?)", [areaId, `Card ${String(i).padStart(2, "0")}`, i]);
}
const phone = await browser2.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
});
await phone.addCookies([{ name: "session_token", value: cookie.split("=")[1], url: BASE }]);
const touchPage = await phone.newPage();
await touchPage.goto(`${BASE}/board/${board.insertId}`, { waitUntil: "load" });
await touchPage.waitForSelector(".card-wrapper [data-card-id]", { timeout: 15000 });
await touchPage.waitForTimeout(800);

const orderInDom = () => touchPage.$$eval(".card-wrapper [data-card-id]", (els) => els.map((e) => e.dataset.cardId).join(","));
const before = await orderInDom();

// A real finger: down on a card, straight up the screen quickly, up again.
const target = await touchPage.locator(".card-wrapper [data-card-id]").nth(3).boundingBox();
const cdp = await phone.newCDPSession(touchPage);
const touch = (type, y) => cdp.send("Input.dispatchTouchEvent", {
  type,
  touchPoints: type === "touchEnd" ? [] : [{ x: target.x + target.width / 2, y }],
});
const startY = target.y + target.height / 2;
await touch("touchStart", startY);
for (let step = 1; step <= 6; step++) await touch("touchMove", startY - step * 40);
await touch("touchEnd", startY - 240);
await touchPage.waitForTimeout(600);

// The column is what scrolls now, not the page: the board fills the viewport
// and each area scrolls its own cards.
const scrolled = await touchPage.evaluate(() => {
  const list = document.querySelector(".card-wrapper");
  return { list: list ? list.scrollTop : 0, page: window.scrollY || document.documentElement.scrollTop || 0 };
});
check("the card list scrolled", scrolled.list > 20, `list ${scrolled.list}, page ${scrolled.page}`);
check("and nothing was reordered", (await orderInDom()) === before);
check("no drag is in progress", (await touchPage.locator(".sortable-ghost, .sortable-fallback").count()) === 0);

console.log("\n8. an area is as tall as there is room for, and no taller");
const shape = await touchPage.evaluate(() => {
  const list = document.querySelector(".card-wrapper");
  const column = list.closest("[class*='rounded-lg']");
  const add = column.querySelector("form, button");
  const r = add.getBoundingClientRect();
  return {
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 2,
    listScrolls: list.scrollHeight > list.clientHeight + 2,
    addTop: Math.round(r.top),
    addBottom: Math.round(r.bottom),
    columnBottom: Math.round(column.getBoundingClientRect().bottom),
    viewport: window.innerHeight,
  };
});
check("the page itself does not scroll", !shape.pageScrolls);
check("the cards do", shape.listScrolls);
check("the column stops inside the viewport", shape.columnBottom <= shape.viewport + 1,
  `${shape.columnBottom} of ${shape.viewport}`);
check("and the add-a-card button is on screen", shape.addTop >= 0 && shape.addBottom <= shape.viewport + 1,
  `${shape.addTop}–${shape.addBottom} of ${shape.viewport}`);

await phone.close();

console.log("\n9. the position control asks nothing it cannot answer");
// An area with no cards in it: there is one place to land, so no buttons.
const [empty] = await c.execute("INSERT INTO areas (board, name, sort) VALUES (?, 'Empty', 3)", [board.insertId]);
const ids4 = await reseed();
await openMove(ids4.B);
check("all three positions offered for an area with cards",
  (await page.locator(".card-modal button", { hasText: /^(Top|Bottom|After)$/ }).count()) === 3,
  `${await page.locator(".card-modal button", { hasText: /^(Top|Bottom|After)$/ }).count()} buttons`);

await page.selectOption(".card-modal select", { label: "Empty" });
await page.waitForTimeout(300);
check("none offered for an empty one",
  (await page.locator(".card-modal button", { hasText: /^(Top|Bottom|After)$/ }).count()) === 0);
await page.locator(".card-modal button", { hasText: "Move card" }).last().click();
await page.waitForTimeout(900);
check("and the card still lands there", (await areaOrder(empty.insertId)) === "B", await areaOrder(empty.insertId));

console.log("\n10. picking \"after\" starts on the first card");
const ids5 = await reseed();
await openMove(ids5.E);
await page.locator(".card-modal button", { hasText: "After" }).first().click();
await page.waitForTimeout(300);
const chosen = await page.locator(".card-modal select").last().inputValue();
const [firstTarget] = await c.execute("SELECT id, name FROM cards WHERE area = ? AND name <> 'E' ORDER BY sort ASC LIMIT 1", [areaId]);
check("the select is not empty", chosen !== "", `value ${JSON.stringify(chosen)}`);
check("and it is the first card in the area", Number(chosen) === Number(firstTarget[0].id),
  `${chosen} vs ${firstTarget[0].id} (${firstTarget[0].name})`);
await page.locator(".card-modal button", { hasText: "Move card" }).last().click();
await page.waitForTimeout(900);
check("moving lands it right after that card", (await areaOrder(areaId)) === "AEBCD", await areaOrder(areaId));

await browser.close();

await c.end();
await new Promise((resolve) => {
  child.once("exit", resolve);
  child.kill("SIGTERM");
  setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5000);
});
await sweep();
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures ? 1 : 0);
