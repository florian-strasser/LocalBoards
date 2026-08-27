import { defineContentConfig, defineCollection } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: "page",
      source: "legal/*.md",
    }),
    docs: defineCollection({
      type: "page",
      source: "docs/*.md",
    }),
    api: defineCollection({
      type: "page",
      source: "api/*.md",
    }),
    // The changelog is not written for this site — it is the repository's own
    // CHANGELOG.md, reached through a symlink in `content/` so the page and the
    // file cannot disagree.
    //
    // Pointing the collection's `cwd` at the repository root instead looks
    // tidier and is a trap: the watcher then walks everything above this
    // directory — node_modules, .output, the screenshot folders — and the dev
    // server dies with EMFILE, too many open files. The link keeps the watcher
    // inside `content/` where it belongs.
    changelog: defineCollection({
      type: "page",
      source: "changelog.md",
    }),
  },
});
