<template>
  <main role="main" class="pt-30">
    <div class="container">
      <div class="flex flex-col gap-10 md:flex-row md:items-start md:gap-12">
        <!-- Literally the documentation's sidebar. These pages are read one at
             a time, but whoever is reading one usually wants another, and the
             site should not change shape between its halves. Below `md` it is
             hidden and the footer's Legal column does the same job. -->
        <SideNav :sections="sections" label="Legal" />

        <!-- `min-w-0` because the copy contains addresses and URLs that do not
             break: without it they set the flex item's width and push the
             sidebar off the page. -->
        <div class="w-full min-w-0 shrink grow">
          <ContentRenderer
            v-if="doc"
            :value="doc"
            class="wysiwyg-wrapper legal-copy"
          />
          <!-- For a page that needs more than its prose: a form, a table, a
               component. Nothing uses it today. -->
          <div class="legal-copy">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const props = defineProps({
  // The content path, e.g. `/legal/privacy-policy`.
  path: { type: String, required: true },
});

// Every legal page there is, in the shape the shared sidebar wants. Adding one
// is a line here, a Markdown file, and a three-line route that renders this
// component.
const pages = [
  { path: "/privacy-policy", title: "Privacy policy" },
  { path: "/site-notice", title: "Site notice" },
];

// The section heading goes to the first page under it, which is what the
// documentation and the reference headings do — it was pointing at the site
// notice while the list underneath began with the privacy policy. Taken from
// the list rather than written out again, so adding a page at the top moves the
// heading with it.
const sections = [{ title: "Legal", to: pages[0]!.path, items: pages }];

const { data: doc } = await useAsyncData(`legal:${props.path}`, () =>
  queryCollection("content").path(props.path).first(),
);

usePageMeta({
  title: doc.value?.title,
  description: doc.value?.description,
});
</script>

<style scoped>
/* Legal text is read in long runs, so it gets a measure rather than the full
   width of the container, and more air between the paragraphs than the
   documentation needs. The heading sizes match the rest of the site instead of
   the docs' smaller scale — this is the top of a page, not a section of one. */
.legal-copy {
  max-width: 68ch;
}
.legal-copy :deep(h1) {
  font-size: 2.25rem;
  line-height: 1.1;
  margin-bottom: 2rem;
}
@media (min-width: 640px) {
  .legal-copy :deep(h1) {
    font-size: 3rem;
  }
}
.legal-copy :deep(h2) {
  margin-top: 3rem;
}
.legal-copy :deep(h3),
.legal-copy :deep(h4) {
  margin-top: 2rem;
}
.legal-copy :deep(p),
.legal-copy :deep(ul),
.legal-copy :deep(ol) {
  line-height: 1.7;
}
/* Body links only. Nuxt Content wraps every heading in an anchor to itself, so
   a bare `a` rule turns the whole outline blue and underlined. */
.legal-copy :deep(p a),
.legal-copy :deep(li a) {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.legal-copy :deep(h1 a),
.legal-copy :deep(h2 a),
.legal-copy :deep(h3 a),
.legal-copy :deep(h4 a) {
  color: inherit;
  text-decoration: none;
}
/* Addresses and long URLs would otherwise run past the column. */
.legal-copy :deep(p) {
  overflow-wrap: anywhere;
}
</style>
