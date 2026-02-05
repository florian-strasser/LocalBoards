<template>
  <div class="container">
    <div class="flex flex-col-reverse lg:flex-row gap-12 items-start">
      <DocsNav :menuItems="menuApi" />
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
const { data: menuApi } = await useAsyncData("navigationApi", () => {
  return queryCollectionNavigation("api").order("title", "ASC");
});
const { data: install } = await useAsyncData(() =>
  queryCollection("api").path("/api/").first(),
);

useSeoMeta({
  title: install.value?.title,
  description: install.value?.description,
});
</script>
