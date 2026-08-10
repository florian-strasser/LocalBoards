import tailwindcss from "@tailwindcss/vite";

const appName = process.env.NUXT_APP_NAME || "LocalBoards";
const language = process.env.NUXT_LANGUAGE || "en";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/content", "nuxt-llms", "@nuxtjs/sitemap"],
  app: {
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
        // the tag; `useSeoMeta` replaces it wherever the content supplies one.
        { name: "description", content: "" },
        { name: "format-detection", content: "telephone=no" },
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
    domain: "https://localboards.de",
    title: "LocalBoards",
    description: "Documentation for LocalBoards",
    contentRawMarkdown: {
      excludeCollections: ["content"],
    },
  },
  // `www` redirects to the apex host, so the apex is what belongs in the
  // sitemap — listing the redirecting form would make every entry a 301.
  // `trailingSlash` matches the same canonicalisation the live site performs.
  site: {
    url: "https://localboards.de",
    name: "LocalBoards",
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
