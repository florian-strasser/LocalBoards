import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/i18n"],
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
  runtimeConfig: {
    public: {
      privacyUrl: process.env.NUXT_PUBLIC_PRIVACY_URL || "/privacy-policy/",
    },
    appName: process.env.NUXT_APP_NAME || "LocalBoards",
    language: process.env.NUXT_LANGUAGE || "en",
    boardsUrl: process.env.NUXT_BOARDS_URL || "http://localhost:3000",
    signup: process.env.NUXT_SIGNUP || true,
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
