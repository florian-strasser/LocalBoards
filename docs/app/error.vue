<template>
  <!-- `app.vue` is not rendered for an error, so the wrapper and the footer are
       repeated here — otherwise a wrong address drops the visitor onto a bare
       white page in the browser's own font, with none of the site around it. -->
  <div>
    <SmoothScroll>
      <AppHeader />
      <main role="main" class="container pt-6 pb-16 sm:pt-10 sm:pb-24">
        <div class="mx-auto max-w-xl py-16 text-center sm:py-24">
          <p class="text-primary text-sm font-medium">{{ error?.statusCode }}</p>
          <h1 class="text-dark mt-3 text-4xl font-medium sm:text-5xl">
            {{ isMissing ? "This page does not exist" : "Something went wrong" }}
          </h1>
          <p class="mt-5 text-lg">
            {{
              isMissing
                ? "The address may be mistyped, or the page may have moved. The documentation and the API reference are both a click away."
                : "The page could not be loaded. Trying again often settles it."
            }}
          </p>
          <div class="mt-9 flex flex-wrap justify-center gap-3">
            <NuxtLink
              to="/"
              class="bg-primary hover:bg-primary-hover rounded-full px-6 py-3 text-white"
              >Back to the homepage</NuxtLink
            >
            <NuxtLink
              to="/docs"
              class="bg-slate text-dark hover:text-primary rounded-full px-6 py-3"
              >Documentation</NuxtLink
            >
            <NuxtLink
              to="/api"
              class="bg-slate text-dark hover:text-primary rounded-full px-6 py-3"
              >API reference</NuxtLink
            >
          </div>
        </div>
      </main>
      <AppFooter />
    </SmoothScroll>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error?: { statusCode?: number } }>();

const isMissing = computed(() => props.error?.statusCode === 404);

usePageMeta({
  title: isMissing.value ? "Page not found" : "Something went wrong",
  description: "The page you were looking for is not here.",
});
</script>
