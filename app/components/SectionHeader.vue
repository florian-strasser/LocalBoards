<template>
    <div class="flex justify-between mb-8">
        <h1 class="text-5xl text-primary"><slot /></h1>
        <NuxtLink
            v-if="props.url"
            :to="props.url"
            class="size-12 bg-primary text-white hover:bg-secondary flex justify-center items-center rounded-full"
            ><PlusIcon class="size-6"
        /></NuxtLink>
    </div>
</template>
<script setup lang="ts">
import { PlusIcon } from "@heroicons/vue/24/solid";
const props = defineProps({
    url: String,
});
</script>
