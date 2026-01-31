<template>
  <div class="container">
    <ContentRenderer v-if="legal" :value="legal" class="wysiwyg-wrapper" />
  </div>
</template>
<script setup lang="ts">
const { data: legal } = await useAsyncData(() =>
  queryCollection("content").path("/legal/site-notice").first(),
);

useSeoMeta({
  title: legal.value?.title,
  description: legal.value?.description,
});
</script>
