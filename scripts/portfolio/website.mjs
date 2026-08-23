// Captures the marketing and documentation site — the thing at
// lokalboards.com, not the app. Separate from scripts/demo/screenshots.mjs
// because it needs no session, no seeded database and no per-language server
// restart: the site carries its own content.
//
//   node scripts/portfolio/website.mjs <output-dir>
//
// Config via env: SITE_BASE_URL (default http://127.0.0.1:3101),
// SITE_WIDTH / SITE_HEIGHT (default 1400x900).
import { chromium } from "@playwright/test";

const outDir = process.argv[2] ?? "portfolio-screenshots/website";
const base = process.env.SITE_BASE_URL ?? "http://127.0.0.1:3101";
const viewport = {
  width: Number(process.env.SITE_WIDTH || 1400),
  height: Number(process.env.SITE_HEIGHT || 900),
};

const results = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });

// The headings animate in on an IntersectionObserver (SplitText), so anything
// that never crossed the viewport is still at opacity 0 when the shutter goes.
// That does not show up in a viewport screenshot, where everything captured was
// on screen by definition — it bites the full-page and whole-section shots,
// which reach past what was ever scrolled through. So: walk the whole page a
// screen at a time, let every observer fire and every animation finish, and
// only then capture.
async function revealAll(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForTimeout(900);
}

async function shot(name, url, { full = false } = {}) {
  const page = await ctx.newPage();
  try {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(base + url, { waitUntil: "load", timeout: 30000 });
    // Fonts, images and any entry animation want to be finished before the
    // shutter: a hero caught mid-fade is the one frame nobody wants in a
    // portfolio.
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(900);
    if (full) await revealAll(page);
    await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: full });
    results.push("ok    " + name + (full ? "  (full page)" : ""));
  } catch (e) {
    results.push("FAIL  " + name + "  :: " + e.message.split("\n")[0]);
  }
  await page.close();
}

// The fold first — what a visitor actually sees — then the whole page, which is
// what a portfolio piece usually wants to show scrolled or in a tall frame.
await shot("01-home", "/");
await shot("02-home-full", "/", { full: true });

// The documentation: its landing page, and two guides that look different from
// each other — one walkthrough with screenshots, one dense reference.
await shot("03-docs-index", "/docs");
await shot("04-docs-index-full", "/docs", { full: true });
await shot("05-docs-boards", "/docs/boards");
await shot("06-docs-single-sign-on", "/docs/single-sign-on");
await shot("07-docs-single-sign-on-full", "/docs/single-sign-on", { full: true });
await shot("08-docs-mcp-server", "/docs/mcp-server");

// The API reference, which is the other half of the site.
await shot("09-api-index", "/api");
await shot("10-api-index-full", "/api", { full: true });

// The homepage one section at a time. Each is taken twice: the whole section at
// its natural height, which is what a portfolio piece usually drops into a
// frame, and a 1400x900 framing of its top, for when every image in the set has
// to be the same shape.
const SECTIONS = [
  ["30-about", "#about"],
  ["31-features", "#features"],
  ["32-pricing", "#pricing"],
  ["33-faq", "#faq"],
  ["34-cta", "section.cta"],
];

async function sectionShots(name, selector, prepare) {
  const page = await ctx.newPage();
  try {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(base + "/", { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.evaluate(() => document.fonts?.ready);
    await revealAll(page);
    const el = page.locator(selector).first();
    await el.scrollIntoViewIfNeeded();
    if (prepare) await prepare(page, el);
    // Anything that animates in on scroll needs to have finished animating.
    await page.waitForTimeout(1200);
    await el.screenshot({ path: `${outDir}/${name}.png` });
    results.push("ok    " + name + "  (whole section)");

    // The framed version: the section's top edge at the top of the window.
    await page.evaluate((sel) => {
      const node = document.querySelector(sel);
      window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
    }, selector);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${outDir}/${name}-framed.png` });
    results.push("ok    " + name + "-framed");
  } catch (e) {
    results.push("FAIL  " + name + "  :: " + e.message.split("\n")[0]);
  }
  await page.close();
}

for (const [name, selector] of SECTIONS) await sectionShots(name, selector);

// The FAQ again with the first answer open — a page of closed accordions shows
// the questions but not that they answer anything.
await sectionShots("35-faq-open", "#faq", async (page, el) => {
  await el.locator("[aria-expanded]").first().click();
  await page.waitForTimeout(500);
});

// The same pages a phone gets, since a responsive site is worth showing as one.
const phone = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const phoneShot = async (name, url) => {
  const page = await phone.newPage();
  try {
    await page.goto(base + url, { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outDir}/${name}.png` });
    results.push("ok    " + name + "  (phone)");
  } catch (e) {
    results.push("FAIL  " + name + "  :: " + e.message.split("\n")[0]);
  }
  await page.close();
};
await phoneShot("20-home-mobile", "/");
await phoneShot("21-docs-mobile", "/docs");

await browser.close();
console.log(results.join("\n"));
console.log(results.some((r) => r.startsWith("FAIL")) ? "\nsome captures failed" : "\nall captures ok");
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
