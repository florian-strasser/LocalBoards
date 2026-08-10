import { defineEventHandler } from "h3";
import { queryCollection } from "@nuxt/content/server";

// Sitemap source for the routes @nuxtjs/sitemap cannot find by itself.
//
// Scanning app/pages finds the static routes (/, /docs/, /api/, the two legal
// pages), but every documentation and API page is served by a single dynamic
// route — app/pages/docs/[slug].vue — whose slugs only exist as Markdown files
// in content/. So they are read back out of the content database here.
//
// This lives at /__sitemap__/urls rather than the module's default
// /api/__sitemap__/urls: the site has its own /api/ section for the REST
// documentation, and a server route hiding inside it would be confusing to
// anyone reading the routes later.
//
// The legal collection is deliberately not included. Its files sit under
// content/legal/, so their content paths (/legal/privacy-policy) are not the
// routes they are served at (/privacy-policy) — and those routes are real
// pages, so page scanning already has them.
export default defineEventHandler(async (event) => {
  const sections = ["docs", "api"] as const;

  const pages = await Promise.all(
    sections.map((section) =>
      queryCollection(event, section).select("path", "title").all(),
    ),
  );

  return pages.flat().flatMap((page) => {
    const loc = page?.path;
    if (!loc) return [];
    // The section landing pages (content/docs/index.md and content/api/index.md)
    // are already contributed by page scanning as /docs/ and /api/.
    if (/^\/(docs|api)\/?$/.test(loc)) return [];
    return [{ loc }];
  });
});
