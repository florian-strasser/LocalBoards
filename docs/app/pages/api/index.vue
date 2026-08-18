<template>
  <div>
    <AppHeader />
    <main role="main" class="container pt-30 pb-16 sm:pb-24">
      <div class="flex flex-col gap-10 md:flex-row md:gap-12 md:items-start">
        <DocsNav />
        <ContentWrapper>
          <ContentRenderer
            v-if="install"
            :value="install"
            class="wysiwyg-wrapper"
          />
        </ContentWrapper>
      </div>
    </main>
  </div>
</template>
<script setup lang="ts">
const { data: install } = await useAsyncData(() =>
  queryCollection("api").path("/api/").first(),
);

usePageMeta({
  title: install.value?.title,
  description: install.value?.description,
});
</script>
