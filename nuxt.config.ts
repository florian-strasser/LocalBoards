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
      title: process.env.NUXT_APP_NAME || "LocalBoards",
      htmlAttrs: {
        lang: process.env.NUXT_LANGUAGE || "en",
      },
      link: [
        { rel: "icon", href: "/touchicon.png" },
        { rel: "apple-touch-icon", href: "/touchicon.png" },
      ],
    },
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: process.env.NUXT_APP_NAME || "LocalBoards",
      titleTemplate: "%s | " + process.env.NUXT_APP_NAME || "LocalBoards",
      htmlAttrs: {
        lang: process.env.NUXT_LANGUAGE || "en",
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
    defaultLocale: process.env.NUXT_LANGUAGE || "en",
  },
  mcp: {
    name: process.env.NUXT_APP_NAME || "LocalBoards",
    version: "0.14.0",
    enabled: process.env.NUXT_MCP || true,
  },
  runtimeConfig: {
    public: {
      privacyUrl: process.env.NUXT_PUBLIC_PRIVACY_URL || "/privacy-policy/",
      signup: process.env.NUXT_PUBLIC_SIGNUP || true,
      colorPrimary: process.env.NUXT_PUBLIC_COLOR_PRIMARY || "#004632",
      colorPrimaryDark: process.env.NUXT_PUBLIC_COLOR_PRIMARY_DARK || "#0a846e",
      colorSecondary: process.env.NUXT_PUBLIC_COLOR_SECONDARY || "#b33e04",
      colorSecondaryDark:
        process.env.NUXT_PUBLIC_COLOR_SECONDARY_DARK || "#e04a05",
      colorWhite: process.env.NUXT_PUBLIC_COLOR_WHITE || "#ffffff",
      colorGray: process.env.NUXT_PUBLIC_COLOR_GRAY || "#3d5e59",
      colorGrayDark: process.env.NUXT_PUBLIC_COLOR_GRAY_DARK || "#b6c8c8",
      colorSlate: process.env.NUXT_PUBLIC_COLOR_SLATE || "#eef5ee",
      colorSlateDark: process.env.NUXT_PUBLIC_COLOR_SLATE_DARK || "#1f2524",
      colorBlack: process.env.NUXT_PUBLIC_COLOR_BLACK || "#000000",
      colorDark: process.env.NUXT_PUBLIC_COLOR_DARK || "#101514",
      colorDarkDark: process.env.NUXT_PUBLIC_COLOR_DARK_DARK || "#101514",
    },
    appName: process.env.NUXT_APP_NAME || "LocalBoards",
    language: process.env.NUXT_LANGUAGE || "en",
    boardsUrl: process.env.NUXT_BOARDS_URL || "http://localhost:3000",
    mysqlHost: process.env.NUXT_MYSQL_HOST || "localhost",
    mysqlDatabase: process.env.NUXT_MYSQL_DATABASE || "root",
    mysqlUser: process.env.NUXT_MYSQL_USER || "root",
    mysqlPassword: process.env.NUXT_MYSQL_PASSWORD || "root1234",
    emailHost: process.env.NUXT_EMAIL_HOST || "mail.yourserver.de",
    emailPort: process.env.NUXT_EMAIL_PORT || 465,
    emailSecure: process.env.NUXT_EMAIL_SECURE || true,
    emailUser: process.env.NUXT_EMAIL_USER || "contact@yourdomain.com",
    emailPass: process.env.NUXT_EMAIL_PASS || "password1234",
  },
  css: ["~/assets/css/main.css"],
  i18n: {
    strategy: "prefix_except_default",
    defaultLocale: process.env.NUXT_LANGUAGE || "en",
    locales: [
      {
        code: process.env.NUXT_LANGUAGE || "en",
        file: (process.env.NUXT_LANGUAGE || "en") + ".json",
      },
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
  site: {
    url: "https://boards.florian-strasser.de",
    name: "LocalBoards",
    trailingSlash: true,
    defaultLocale: "de",
  },
  ssr: true,
  telemetry: false,
});
