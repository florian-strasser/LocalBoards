<template>
  <div
    class="w-64 sm:w-72 px-8 py-7 sm:px-12 sm:py-10 bg-white rounded-3xl shrink-0 lg:sticky top-6 left-0"
  >
    <ul>
      <template v-for="menuItem in props.menuItems">
        <li v-for="childItem in props.menuItems[0]?.children">
          <NuxtLink class="hover:text-primary" :to="childItem.path">{{
            childItem.title
          }}</NuxtLink>
        </li>
      </template>
    </ul>
  </div>
</template>
<script setup lang="ts">
const props = defineProps({
  menuItems: Array,
});
</script>
