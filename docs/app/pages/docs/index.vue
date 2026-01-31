<template>
  <div class="container">
    <div class="flex gap-12 items-start">
      <DocsNav :menuItems="menu" />
      <ContentWrapper>
        <ContentRenderer
          v-if="install"
          :value="install"
          class="wysiwyg-wrapper"
        />
      </ContentWrapper>
    </div>
  </div>
</template>
<script setup lang="ts">
const { data: menu } = await useAsyncData("navigation", () => {
  return queryCollectionNavigation("docs").order("title", "ASC");
});
const { data: install } = await useAsyncData(() =>
  queryCollection("docs").path("/docs/").first(),
);

useSeoMeta({
  title: install.value?.title,
  description: install.value?.description,
});
</script>
