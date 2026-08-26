// The toast stack: several toasts coexist instead of overwriting each other,
// they are laid out as a plain column, and each carries a countdown ring that is
// also the clock that dismisses it.
//
// Driven through the sign-in page, which can raise three distinct toasts with
// no session: the `?sso_error=` message on mount, a client-side validation
// error, and a server-side sign-in failure.
import { chromium } from "playwright";
import fs from "node:fs";
import { spawn } from "node:child_process";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);

const PORT = Number(process.env.TOAST_TEST_PORT || 3111);
const BASE = `http://127.0.0.1:${PORT}`;

// A server left behind by an earlier run would answer the readiness check while
// the one spawned here silently failed to bind — and the suite would then be
// testing an old build without saying so. Better to stop than to lie.
try {
  await fetch(BASE + "/", { signal: AbortSignal.timeout(1500) });
  console.error(`something is already listening on ${PORT}; stop it first`);
  process.exit(1);
} catch {}

const child = spawn("node", [".output/server/index.mjs"], {
  env: { ...process.env, ...env, PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_MYSQL_SSL: "false" },
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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
await page.goto(`${BASE}/?sso_error=no_account`, { waitUntil: "load" });

const cards = page.locator("div.fixed.bottom-8.right-8 > div");
const rings = page.locator("div.fixed.bottom-8.right-8 svg circle[stroke-dasharray]");

// What the browser is actually painting: box after transforms, and opacity.
const painted = () => cards.evaluateAll((els) =>
  els.map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height, opacity: Number(getComputedStyle(el).opacity) };
  }),
);
// Cards must never overlap. Comparing boxes rather than gaps-against-a-height
// stays true when a three-line message sits next to a one-line one.
// The list runs top to bottom, so each card must start below its predecessor's
// bottom edge.
const overlaps = (list) => list.slice(1).map((card, i) => card.top < list[i].bottom - 0.5);
// The dasharray is normalised to 0..1 by pathLength, so it IS the fraction drawn.
const drawn = (i = 0) => rings.nth(i).evaluate((el) =>
  parseFloat((getComputedStyle(el).strokeDasharray || "0").split(/[, ]+/)[0]) || 0,
);

const settle = (ms = 900) => page.waitForTimeout(ms);

// Raise a second and third toast: a password under the minimum trips client-side
// validation, a long wrong one reaches the server and comes back refused.
const signInWith = async (password) => {
  await page.fill('input[type="email"]', "nobody@example.test");
  await page.fill('input[type="password"]', password);
  await page.click('input[type="submit"]');
  await settle(700);
};

console.log("\n1. toasts stack instead of replacing one another");
await cards.first().waitFor({ timeout: 5000 });
check("one after the sso error", (await cards.count()) === 1);
await signInWith("short");
check("two after a validation failure", (await cards.count()) === 2, `${await cards.count()} cards`);
await signInWith("definitely-not-the-password");
check("three after a sign-in failure", (await cards.count()) === 3, `${await cards.count()} cards`);

console.log("\n2. they are a plain column, oldest first");
await settle();
const laid = await painted();
check("nothing overlaps", overlaps(laid).every((v) => !v), JSON.stringify(overlaps(laid)));
const gaps = laid.slice(1).map((card, i) => card.top - laid[i].bottom);
check("spaced by the stack's own gap", gaps.every((g) => Math.abs(g - 8) < 2), gaps.map((g) => g.toFixed(1)).join(", "));
check("newest nearest the corner", laid[laid.length - 1].bottom > laid[0].bottom,
  `first ends ${laid[0].bottom.toFixed(0)}, last ends ${laid[laid.length - 1].bottom.toFixed(0)}`);
check("all fully opaque", laid.every((c) => c.opacity > 0.99), laid.map((c) => c.opacity.toFixed(2)).join(", "));

console.log("\n3. the pointer stops every clock");
const before = [await drawn(0), await drawn(1), await drawn(2)];
check("the rings were running", before.some((v) => v > 0.05), before.map((v) => v.toFixed(2)).join(", "));
await cards.first().hover();
await settle(300);
const paused = [await drawn(0), await drawn(1), await drawn(2)];
await page.waitForTimeout(1500);
const stillPaused = [await drawn(0), await drawn(1), await drawn(2)];
check("every ring frozen", stillPaused.every((v, i) => Math.abs(v - paused[i]) < 0.01),
  paused.map((v, i) => `${v.toFixed(3)}→${stillPaused[i].toFixed(3)}`).join("  "));
check("none expired while hovered", (await cards.count()) === 3);

console.log("\n4. the same message twice makes two cards");
await page.mouse.move(10, 10);
await settle(300);
const beforeDupe = await cards.count();
await signInWith("definitely-not-the-password");
check("a card was added", (await cards.count()) === beforeDupe + 1, `${beforeDupe} → ${await cards.count()}`);

console.log("\n5. they leave when their own ring closes");
await page.waitForTimeout(8000);
check("stack empties", (await cards.count()) === 0, `${await cards.count()} left`);

console.log("\n6. with reduced motion a toast still gets its five seconds");
const reduced = await browser.newPage({ viewport: { width: 1000, height: 800 } });
await reduced.emulateMedia({ reducedMotion: "reduce" });
await reduced.goto(`${BASE}/?sso_error=no_account`, { waitUntil: "load" });
const reducedCards = reduced.locator("div.fixed.bottom-8.right-8 > div");
await reducedCards.first().waitFor({ timeout: 5000 });
await reduced.waitForTimeout(2000);
check("still there after 2s", (await reducedCards.count()) === 1);
await reduced.waitForTimeout(4500);
check("gone after its full time", (await reducedCards.count()) === 0);
await reduced.close();

console.log("\n7. the exit sinks straight down");
const solo = await browser.newPage({ viewport: { width: 1000, height: 800 } });
await solo.goto(`${BASE}/?sso_error=no_account`, { waitUntil: "load" });
const soloCard = solo.locator("div.fixed.bottom-8.right-8 > div");
await soloCard.first().waitFor({ timeout: 5000 });
// Let it finish arriving first. A card enters from 1rem below, and `waitFor`
// returns at the start of that — measuring there put "resting" 16px too low,
// which is exactly where the exit ends, so nothing ever looked like it moved.
await solo.waitForTimeout(600);
const resting = await soloCard.first().boundingBox();
// Sample the card as it leaves. It is removed when the transition ends, so this
// polls fast and keeps whatever it caught on the way out.
// Read the rect straight from the DOM: Playwright's boundingBox() waits for a
// missing element, and the whole point here is to keep sampling until it is
// gone — that wait would be thirty seconds per frame.
const rectNow = () => solo.evaluate(() => {
  const el = document.querySelector("div.fixed.bottom-8.right-8 > div");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});
const frames = [];
for (let i = 0; i < 260; i++) {
  const box = await rectNow();
  if (!box) { if (frames.length) break; } else if (box.y > resting.y + 0.5) frames.push(box);
  await solo.waitForTimeout(25);
}
check("caught it mid-exit", frames.length > 0, `${frames.length} frames`);
if (frames.length) {
  const dx = Math.max(...frames.map((f) => Math.abs(f.x - resting.x)));
  const dw = Math.max(...frames.map((f) => Math.abs(f.width - resting.width)));
  const dh = Math.max(...frames.map((f) => Math.abs(f.height - resting.height)));
  const dy = Math.max(...frames.map((f) => f.y - resting.y));
  check("no sideways drift", dx < 1, `${dx.toFixed(2)}px`);
  check("no resizing", dw < 1 && dh < 1, `w ${dw.toFixed(2)}px, h ${dh.toFixed(2)}px`);
  check("moves down", dy > 2, `${dy.toFixed(1)}px`);
}
await solo.close();

await browser.close();
await new Promise((resolve) => {
  child.once("exit", resolve);
  child.kill("SIGTERM");
  setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5000);
});
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures ? 1 : 0);
