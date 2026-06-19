import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  features: {
    inlineStyles: true,
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  modules: ["@nuxtjs/i18n", "@nuxtjs/mcp-toolkit"],
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
        { rel: "icon", href: "/touchicon.png" },
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
    version: "0.15.2",
    enabled: process.env.NUXT_MCP || true,
  },
  runtimeConfig: {
    public: {
      privacyUrl: process.env.NUXT_PUBLIC_PRIVACY_URL || "/privacy-policy/",
      signup: process.env.NUXT_PUBLIC_SIGNUP || true,
      colorPrimary: process.env.NUXT_PUBLIC_COLOR_PRIMARY || "#0066CC",
      colorPrimaryDark: process.env.NUXT_PUBLIC_COLOR_PRIMARY_DARK || "#0F72DE",
      colorSecondary: process.env.NUXT_PUBLIC_COLOR_SECONDARY || "#004C99",
      colorSecondaryDark:
        process.env.NUXT_PUBLIC_COLOR_SECONDARY_DARK || "#1C84EC",
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
    experimental: {
      tasks: true,
      websocket: true,
      asyncContext: true,
    },
    scheduledTasks: {
      // Run `notification` task every hour
      "0 * * * *": ["notification"],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  ssr: true,
  telemetry: false,
});
