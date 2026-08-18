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
