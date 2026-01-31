import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/content", "nuxt-llms"],
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
      title: "LocalBoards",
      titleTemplate: "%s | " + "LocalBoards",
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
  site: {
    url: "https://www.localboards.de",
    name: "LocalBoards",
    trailingSlash: true,
    defaultLocale: "de",
  },
  ssr: true,
  telemetry: false,
});
