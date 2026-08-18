<template>
  <!-- Hidden below `md`, where these entries live in the header's menu or the
       footer instead. Stacking them under the article put them where nobody
       looks. -->
  <nav
    class="hidden w-full shrink-0 rounded-3xl md:block md:w-48"
    :aria-label="label"
  >
    <div v-for="(section, index) in sections" :key="section.title">
      <p class="text-dark font-medium" :class="index ? 'mt-8' : ''">
        <NuxtLink :to="section.to" class="hover:text-primary">{{
          section.title
        }}</NuxtLink>
      </p>
      <ul class="border-gray/15 mt-3 flex flex-col gap-y-2 border-l pl-4">
        <li v-for="item in section.items" :key="item.path">
          <NuxtLink
            :to="item.path"
            class="hover:text-primary block"
            :class="{ 'text-primary': isCurrent(item.path) }"
            >{{ item.title }}</NuxtLink
          >
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup lang="ts">
// The one sidebar. It was written twice — once for the documentation and once
// for the legal pages — and the second copy kept the grey rounded box the
// documentation had already moved away from, so the two halves of the site
// stopped matching. Both render this now, and a change lands in both.
type Item = { path: string; title: string };
type Section = { title: string; to: string; items: Item[] };

defineProps<{ sections: Section[]; label: string }>();

const route = useRoute();

// The content paths and the router's disagree about trailing slashes, so they
// are compared without one.
const trim = (path: string) => path.replace(/\/+$/, "") || "/";
const isCurrent = (path: string) => trim(path) === trim(route.path);
</script>
