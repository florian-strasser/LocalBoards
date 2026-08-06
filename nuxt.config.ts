import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  features: {
    inlineStyles: true,
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  modules: ["@nuxtjs/i18n", "@nuxtjs/mcp-toolkit", "motion-v/nuxt"],
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      // The title/titleTemplate and the html lang attribute are set at runtime
      // in app.vue from runtimeConfig (NUXT_APP_NAME / NUXT_LANGUAGE); see the
      // notes there. The values here are only static fallbacks.
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "" },
        { name: "format-detection", content: "telephone=no" },
      ],
      link: [
        // Icons are generated at runtime (see server/routes/favicon.svg.get.ts
        // and server/routes/touchicon.png.get.ts) so they pick up the instance's
        // configured primary colour instead of a build-time default. A single
        // favicon in the primary colour is used for both light and dark tabs:
        // Safari doesn't switch favicons by `prefers-color-scheme` (neither an
        // in-SVG media query nor a `media` link attribute works without a JS
        // polling shim), so a theme-specific variant only broke the other theme.
        // The PNG is the fallback for browsers without SVG-favicon support and
        // for the Apple touch icon (which doesn't support SVG).
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "icon", type: "image/png", href: "/touchicon.png" },
        { rel: "apple-touch-icon", href: "/touchicon.png" },
      ],
    },
  },
  site: {
    url: process.env.NUXT_BOARDS_URL || "http://localhost:3000",
    name: process.env.NUXT_APP_NAME || "LocalBoards",
    trailingSlash: true,
  },
  mcp: {
    name: process.env.NUXT_APP_NAME || "LocalBoards",
    version: "0.22.2",
    enabled: process.env.NUXT_MCP || true,
  },
  runtimeConfig: {
    public: {
      privacyUrl: process.env.NUXT_PUBLIC_PRIVACY_URL || "/privacy-policy/",
      signup: process.env.NUXT_PUBLIC_SIGNUP || true,
      colorPrimary: process.env.NUXT_PUBLIC_COLOR_PRIMARY || "#0066CC",
      colorPrimaryDark: process.env.NUXT_PUBLIC_COLOR_PRIMARY_DARK || "#0F72DE",
      colorPrimaryHover:
        process.env.NUXT_PUBLIC_COLOR_PRIMARY_HOVER || "#004C99",
      colorPrimaryHoverDark:
        process.env.NUXT_PUBLIC_COLOR_PRIMARY_HOVER_DARK || "#1C84EC",
      colorSecondary: process.env.NUXT_PUBLIC_COLOR_SECONDARY || "#12784F",
      colorSecondaryDark:
        process.env.NUXT_PUBLIC_COLOR_SECONDARY_DARK || "#17996A",
      colorWhite: process.env.NUXT_PUBLIC_COLOR_WHITE || "#ffffff",
      colorGray: process.env.NUXT_PUBLIC_COLOR_GRAY || "#4E4E52",
      colorGrayDark: process.env.NUXT_PUBLIC_COLOR_GRAY_DARK || "#AEAEB2",
      colorSlate: process.env.NUXT_PUBLIC_COLOR_SLATE || "#F5F5F7",
      colorSlateDark: process.env.NUXT_PUBLIC_COLOR_SLATE_DARK || "#2C2C2E",
      colorBlack: process.env.NUXT_PUBLIC_COLOR_BLACK || "#000000",
      colorDark: process.env.NUXT_PUBLIC_COLOR_DARK || "#1C1C1E",
      colorDarkDark: process.env.NUXT_PUBLIC_COLOR_DARK_DARK || "#1C1C1E",
    },
    appName: process.env.NUXT_APP_NAME || "LocalBoards",
    language: process.env.NUXT_LANGUAGE || "en",
    boardsUrl: process.env.NUXT_BOARDS_URL || "http://localhost:3000",
    // How many days a login session stays valid. Defaults to 1 day.
    sessionMaxAgeDays: process.env.NUXT_SESSION_MAX_AGE_DAYS || "1",
    mysqlHost: process.env.NUXT_MYSQL_HOST || "localhost",
    mysqlDatabase: process.env.NUXT_MYSQL_DATABASE || "root",
    mysqlUser: process.env.NUXT_MYSQL_USER || "root",
    mysqlPassword: process.env.NUXT_MYSQL_PASSWORD || "root1234",
    mysqlSsl: process.env.NUXT_MYSQL_SSL || "",
    mysqlSslRejectUnauthorized:
      process.env.NUXT_MYSQL_SSL_REJECT_UNAUTHORIZED || "",
    emailHost: process.env.NUXT_EMAIL_HOST || "mail.yourserver.de",
    emailPort: process.env.NUXT_EMAIL_PORT || 465,
    emailSecure: process.env.NUXT_EMAIL_SECURE || true,
    emailUser: process.env.NUXT_EMAIL_USER || "contact@yourdomain.com",
    emailPass: process.env.NUXT_EMAIL_PASS || "password1234",
  },
  css: ["~/assets/css/main.css"],
  i18n: {
    // Bundle every locale and pick the active one at runtime from
    // NUXT_LANGUAGE (see app/plugins/i18n-locale.ts). The config is evaluated
    // at build time when the env variable isn't available, so we can't select
    // the language here. "no_prefix" keeps URLs unprefixed (as before, since
    // the single default locale was never prefixed).
    strategy: "no_prefix",
    defaultLocale: "en",
    detectBrowserLanguage: false,
    locales: [
      { code: "en", file: "en.json" },
      { code: "de", file: "de.json" },
      { code: "fr", file: "fr.json" },
      { code: "es", file: "es.json" },
      { code: "it", file: "it.json" },
      { code: "nl", file: "nl.json" },
      { code: "pl", file: "pl.json" },
    ],
  },
  nitro: {
    // Pre-compress static assets (JS/CSS/etc.) at build time. The node server
    // serves the .br/.gz variant when the client's Accept-Encoding allows,
    // which is a big win for the large client bundle. Uses Node's built-in
    // zlib, so no extra dependency.
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    experimental: {
      tasks: true,
      websocket: true,
      asyncContext: true,
    },
    scheduledTasks: {
      // Email unread notifications every hour
      "0 * * * *": ["notification"],
      // Fire card due-date reminders every 5 minutes
      "*/5 * * * *": ["due-reminders"],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  ssr: true,
  telemetry: false,
});
