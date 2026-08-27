<template>
  <div>
    <AppHeader />
    <!-- The documentation's layout, to the letter. This is a page of the same
         manual and was the only one standing on its own without the sidebar
         beside it. -->
    <main role="main" class="container pt-30 pb-16 sm:pb-24">
      <div class="flex flex-col gap-10 md:flex-row md:gap-12 md:items-start">
        <DocsNav />
        <ContentWrapper>
          <h1 class="text-dark mb-6 text-4xl sm:text-5xl">Changelog</h1>
          <p class="text-gray mb-10">
            Every release of LokalBoards, newest first. This is the repository's
            own <code>CHANGELOG.md</code> — the same file the source ships with,
            rendered here rather than copied, so the two cannot drift apart.
          </p>
          <ContentRenderer
            v-if="doc"
            :value="doc"
            class="wysiwyg-wrapper changelog-copy"
          />
        </ContentWrapper>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// The sidebar's menus, awaited here so they are in the server-rendered HTML
// rather than appearing after hydration — the same as the documentation pages.
const { ready } = useDocsNavigation();
await ready;

const { data: raw } = await useAsyncData("changelog", () =>
  queryCollection("changelog").first(),
);

// An entry in the changelog is several paragraphs under one bullet, and the
// parser flattens those into a single run of text with `br` between them — the
// tree that comes back holds `["br", {}]`, not two paragraphs. No CSS can undo
// that: a browser ignores every box property on a `<br>`, so there is nothing to
// put the space back with. Splitting the list item's children on those breaks
// and wrapping each run in a paragraph restores what the Markdown said, before
// any of it is rendered, so the server sends it correctly too.
const asParagraphs = (node: any): any => {
  if (!Array.isArray(node)) return node;
  const [tag, props, ...children] = node;
  const walked = children.map(asParagraphs);
  if (tag !== "li") return [tag, props, ...walked];

  const runs: any[][] = [[]];
  for (const child of walked) {
    if (Array.isArray(child) && child[0] === "br") runs.push([]);
    else runs[runs.length - 1]!.push(child);
  }
  const kept = runs.filter((run) => run.length);
  if (kept.length < 2) return [tag, props, ...walked];
  return [tag, props, ...kept.map((run) => ["p", {}, ...run])];
};

const doc = computed(() => {
  const value = raw.value as any;
  if (!value?.body?.value) return value;
  return {
    ...value,
    body: { ...value.body, value: value.body.value.map(asParagraphs) },
  };
});

usePageMeta({
  title: "Changelog",
  description:
    "Every release of LokalBoards, with what changed in each and why.",
});
</script>
