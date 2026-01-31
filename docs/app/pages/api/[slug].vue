<template>
  <div class="container">
    <div class="flex gap-12 items-start">
      <DocsNav :menuItems="menuApi" />
      <ContentWrapper>
        <ContentRenderer v-if="page" :value="page" class="wysiwyg-wrapper" />
      </ContentWrapper>
    </div>
  </div>
</template>
<script setup lang="ts">
const route = useRoute();
const url_slug = route.params.slug;
const { data: menuApi } = await useAsyncData("navigationApi", () => {
  return queryCollectionNavigation("api").order("title", "ASC");
});
const { data: page } = await useAsyncData("page_" + url_slug, () =>
  queryCollection("api")
    .path("/api/" + url_slug)
    .first(),
);

useSeoMeta({
  title: page.value?.title,
  description: page.value?.description,
});
</script>
