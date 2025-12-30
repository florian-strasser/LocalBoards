import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/fonts", "@nuxtjs/i18n"],
  app: {
    head: {
      title: process.env.APP_NAME || "LocalBoards",
      htmlAttrs: {
        lang: "en",
      },
      link: [
        { rel: "icon", href: "/touchicon.png" },
        { rel: "apple-touch-icon", href: "/touchicon.png" },
      ],
    },
  },
  css: ["~/assets/css/main.css"],
  i18n: {
    defaultLocale: "en",
    locales: [
      {
        code: "en",
        name: "English",
        file: "en.json",
      },
      {
        code: "de",
        name: "Deutsch",
        file: "de.json",
      },
    ],
  },
  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      // Run `notification` task every 6 hours
      "0 0 * * *": ["notification"],
      "0 6 * * *": ["notification"],
      "0 12 * * *": ["notification"],
      "0 18 * * *": ["notification"],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  ssr: true,
});
