// The two content menus, in the shape both the sidebar and the small-screen
// menu want them. Shared rather than queried twice: the `useAsyncData` keys are
// the same in both callers, so the data is fetched once and reused.
//
// Everything here runs synchronously. A composable that awaits and then calls
// `useRoute()` loses the Nuxt context on the way and fails with E1001, so the
// waiting is left to the caller: `await ready` in a `<script setup>`, where
// Nuxt keeps the context across the await.
export const useDocsNavigation = () => {
  const route = useRoute();

  // Neither menu is alphabetical: both read in the order you would meet them —
  // install, then boards, their areas, the cards in them — rather than opening
  // on "Adjust Colors" and putting "Area" before "Areas". The numeric prefixes
  // on the files carry that order and are stripped from the paths.
  const docs = useAsyncData("nav-docs", () => queryCollectionNavigation("docs"));
  const api = useAsyncData("nav-api", () => queryCollectionNavigation("api"));

  const sections = computed(() => [
    {
      title: "Documentation",
      to: "/docs",
      items: docs.data.value?.[0]?.children ?? [],
    },
    {
      title: "API reference",
      to: "/api",
      items: api.data.value?.[0]?.children ?? [],
    },
  ]);

  // The content paths and the router's disagree about trailing slashes, so they
  // are compared without one.
  const trim = (path: string) => path.replace(/\/+$/, "") || "/";
  const isCurrent = (path: string) => trim(path) === trim(route.path);

  // Whether this page is one of the documented ones — which is what decides
  // whether the small-screen menu carries these sections at all.
  const inDocs = computed(() => /^\/(docs|api)(\/|$)/.test(route.path));

  // Await this in the caller so the menus are in the server-rendered HTML
  // rather than appearing after hydration.
  const ready = Promise.all([docs, api]);

  return { sections, isCurrent, inDocs, ready };
};
