import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/fonts", "@nuxtjs/i18n"],
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
      privacyUrl: "/privacy-policy/",
    },
    appName: "LocalBoards",
    language: "en",
    boardsUrl: "http://localhost:3000",
    signup: true,
    mysqlHost: "localhost",
    mysqlHost: "localhost",
    mysqlDatabase: "ra7",
    mysqlUser: "root",
    mysqlPassword: "root1234",
    emailHost: "mail.yourserver.de",
    emailPort: 465,
    emailSecure: true,
    emailUser: "contact@yourdomain.com",
    emailPass: "password1234",
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
      // Run `notification` task every 6 hours
      "54 0 * * *": ["notification"],
      "0 6 * * *": ["notification"],
      "0 12 * * *": ["notification"],
      "0 18 * * *": ["notification"],
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
