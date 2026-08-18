<template>
  <div>
    <AppHeader />
    <main role="main" class="container pt-30  pb-16 sm:pb-24">
      <div class="flex flex-col gap-10 md:flex-row md:gap-12 md:items-start">
        <DocsNav />
        <ContentWrapper>
          <ContentRenderer :value="page!" class="wysiwyg-wrapper" />
        </ContentWrapper>
      </div>
    </main>
  </div>
</template>
<script setup lang="ts">
const route = useRoute();
const url_slug = route.params.slug;
const { data: page } = await useAsyncData("api_" + url_slug, () =>
  queryCollection("api")
    .path("/api/" + url_slug)
    .first(),
);

// A slug with no page behind it used to render the chrome around an empty
// article and answer `200`, so a mistyped URL looked like a real but empty page
// — to a reader and to a crawler alike.
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
}

usePageMeta({
  title: page.value?.title,
  description: page.value?.description,
});
</script>
