<template>
    <NuxtLink
        :to="'/board/' + props.id"
        class="flex flex-col gap-y-6 justify-between items-start min-h-48 px-6 py-5 rounded-lg bg-primary hover:bg-secondary group"
    >
        <div class="text-white w-full text-right">{{ props.style }}</div>
        <div
            class="px-3 py-2 rounded-lg bg-white text-primary group-hover:text-secondary"
        >
            {{ props.name }}
        </div>
    </NuxtLink>
</template>
<script setup lang="ts">
import { TrashIcon, ArrowRightIcon } from "@heroicons/vue/24/outline";
const props = defineProps({
    id: Number,
    name: String,
    style: String,
});
</script>
