// Captures a screenshot of every page and modal against a running demo server,
// authenticating as the seeded admin by setting the session cookie directly.
//
//   node scripts/demo/screenshots.mjs <output-dir>
//
// Config via env: DEMO_BASE_URL (default http://127.0.0.1:3100),
// DEMO_TOKEN (default demo-token-alex). The active UI language is whatever the
// server was started with (NUXT_LANGUAGE) — run.sh restarts it per language.
import { chromium } from "@playwright/test";

// Default like gallery.mjs does: without it, running this script directly wrote
// its screenshots into a literal "undefined" folder at the repo root.
const outDir = process.argv[2] ?? "demo-screenshots";
if (!outDir) {
  console.error("usage: node scripts/demo/screenshots.mjs <output-dir>");
  process.exit(1);
}
const base = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3100";
const TOKEN = process.env.DEMO_TOKEN ?? "demo-token-alex";
const results = [];

const browser = await chromium.launch();

async function shot(ctx, name, url, action) {
  const page = await ctx.newPage();
  try {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(base + url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1200);
    if (action) await action(page);
    await page.screenshot({ path: `${outDir}/${name}.png` });
    results.push("ok    " + name);
  } catch (e) {
    results.push("FAIL  " + name + "  :: " + e.message.split("\n")[0]);
  }
  await page.close();
}

const viewport = { width: 1440, height: 900 };
const auth = await browser.newContext({ viewport, deviceScaleFactor: 2 });
await auth.addCookies([{ name: "session_token", value: TOKEN, url: base }]);
const pub = await browser.newContext({ viewport, deviceScaleFactor: 2 });

// A phone-shaped pass, for the one place a 1440-wide board is the wrong picture:
// the homepage hero, where a desktop screenshot scaled to a phone's width turns
// the cards into unreadable specks. Only the board is captured this way — the
// rest of the gallery documents the interface people work in.
const phone = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
await phone.addCookies([{ name: "session_token", value: TOKEN, url: base }]);

// --- Public pages (no session) ---
await shot(pub, "01-sign-in", "/");
await shot(pub, "02-sign-up", "/sign-up");
await shot(pub, "03-lost-password", "/lost-password");

// --- Authenticated pages ---
await shot(auth, "10-dashboard", "/dashboard");
await shot(auth, "11-board-kanban", "/board/1");
await shot(auth, "12-board-todo", "/board/3");
await shot(auth, "13-settings", "/settings");
await shot(auth, "14-users", "/users");
await shot(auth, "15-new-user", "/new-user");
await shot(auth, "16-edit-user", "/edit-user/u-ben");

// --- Modals / overlays ---
await shot(auth, "20-modal-create-board", "/dashboard", async (p) => {
  await p.click('[data-onboarding="new-board"]');
  await p.waitForTimeout(600);
});
await shot(auth, "21-menu-actions", "/dashboard", async (p) => {
  await p.click('button[aria-haspopup="menu"]');
  await p.waitForTimeout(400);
});
await shot(auth, "22-modal-trello-import", "/dashboard", async (p) => {
  await p.click('button[aria-haspopup="menu"]');
  await p.waitForTimeout(300);
  await p.click('[role="menu"] button');
  await p.waitForTimeout(600);
});
// The board's actions live in a three-dots menu: open it, then pick the entry.
const boardMenuItem = (index) => async (p) => {
  await p.click('button[aria-haspopup="menu"]');
  await p.waitForTimeout(300);
  await p.click(`[role="menu"] button >> nth=${index}`);
  await p.waitForTimeout(600);
};
await shot(auth, "23-modal-board-options", "/board/1", boardMenuItem(0));
await shot(auth, "24-modal-invite", "/board/1", boardMenuItem(1));
await shot(auth, "25-modal-delete-board", "/board/1", boardMenuItem(2));
await shot(auth, "26-modal-card", "/board/1", async (p) => {
  await p.click("text=Redesign the logo");
  await p.waitForTimeout(900);
});
await shot(auth, "27-modal-image-lightbox", "/board/1", async (p) => {
  await p.click("text=Redesign the logo");
  await p.waitForTimeout(900);
  await p.click("text=logo-mockup.png");
  await p.waitForTimeout(1400);
});
await shot(auth, "28-modal-delete-area", "/board/1", async (p) => {
  await p.locator('[data-onboarding="areas"] > div').first().locator("button").first().click();
  await p.waitForTimeout(600);
});
await shot(auth, "30-search", "/dashboard", async (p) => {
  await p.click("header input[type=search]");
  // A term that hits several kinds of result, so the shot shows the grouping.
  await p.type("header input[type=search]", "logo", { delay: 60 });
  await p.waitForTimeout(1200);
});
await shot(auth, "29-modal-delete-user", "/users", async (p) => {
  await p.locator("li", { hasText: "Ben Schmidt" }).locator("button").last().click();
  await p.waitForTimeout(600);
});

// --- Phone ---
await shot(phone, "40-board-kanban-mobile", "/board/1");

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
await browser.close();
process.exit(failed ? 1 : 0);
