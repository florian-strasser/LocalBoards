import tailwindcss from "@tailwindcss/vite";

const appName = process.env.NUXT_APP_NAME || "LokalBoards";
const language = process.env.NUXT_LANGUAGE || "en";
// The canonical host, shared by the sitemap below and the absolute URLs the
// social card needs.
const siteURL = "https://lokalboards.com";

export default defineNuxtConfig({
  features: {
    inlineStyles: true,
  },
  experimental: {
    extractAsyncDataHandlers: true,
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/content",
    "nuxt-llms",
    "@nuxtjs/sitemap",
    "motion-v/nuxt",
    "lenis/nuxt",
  ],
  app: {
    // The wipe between pages: a panel in the
    // primary colour sweeps up over the outgoing page and off the top of the
    // incoming one. `out-in` matters — the two pages must not be on screen at
    // once, or the wipe covers a crossfade instead of a change.
    pageTransition: { name: "page", mode: "out-in" },
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      // Used on its own for a page that sets no title, and as the suffix behind
      // every page that does — pages set theirs through `useSeoMeta`.
      title: appName,
      titleTemplate: `%s | ${appName}`,
      htmlAttrs: {
        lang: language,
      },
      meta: [
        // An empty default so a page without its own description still emits
        // the tag; `usePageMeta` replaces it wherever the content supplies one.
        { name: "description", content: "" },
        { name: "format-detection", content: "telephone=no" },
        // The browser chrome, for the browsers that still read this. Safari 26
        // dropped it and takes the colour from the page canvas instead, which
        // is white — so the two agree either way.
        { name: "theme-color", content: "#ffffff" },
        // A link to the site used to unfurl as a bare title with no picture at
        // all. The card is the same everywhere — it says what LokalBoards is,
        // which is the useful thing for any page of it — while the title and
        // description come from the page through `usePageMeta`. Absolute URLs,
        // because a crawler has no page to resolve a relative one against.
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: appName },
        { property: "og:image", content: `${siteURL}/images/og-card.png` },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        {
          property: "og:image:alt",
          content: `${appName} — open-source Kanban you host yourself`,
        },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: `${siteURL}/images/og-card.png` },
      ],
      link: [
        { rel: "icon", href: "/touchicon.png" },
        { rel: "apple-touch-icon", href: "/touchicon.png" },
      ],
    },
  },
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  llms: {
    domain: "https://lokalboards.com",
    title: "LokalBoards",
    description: "Documentation for LokalBoards",
    contentRawMarkdown: {
      excludeCollections: ["content"],
    },
  },
  // `www` redirects to the apex host, so the apex is what belongs in the
  // sitemap — listing the redirecting form would make every entry a 301.
  // `trailingSlash` matches the same canonicalisation the live site performs.
  site: {
    url: siteURL,
    name: "LokalBoards",
    trailingSlash: true,
    defaultLocale: "de",
  },
  sitemap: {
    // The static pages (/, /docs/, /api/, the legal ones) are found by scanning
    // app/pages. Everything under /docs/<slug> and /api/<slug> is a dynamic
    // route backed by a Markdown file, so those come from the endpoint below.
    sources: ["/__sitemap__/urls"],
    // Nothing here is behind a login and there is no search or filter to
    // generate junk URLs, so there is nothing to exclude.
  },
  ssr: true,
  telemetry: false,
});
