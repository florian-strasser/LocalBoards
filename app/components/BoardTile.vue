<template>
    <NuxtLinkLocale
        :to="'/board/' + props.id"
        class="flex flex-col gap-y-6 justify-between items-start min-h-48 px-6 py-5 rounded-lg bg-primary hover:bg-secondary group"
    >
        <div class="text-white w-full">
            <Kanban
                v-if="props.style === 'kanban'"
                class="size-8 ml-auto mr-0"
            />
            <ListCheck
                v-if="props.style === 'todo'"
                class="size-8 ml-auto mr-0"
            />
        </div>
        <div
            class="px-3 py-2 rounded-lg bg-white text-primary group-hover:text-secondary"
        >
            {{ props.name }}
        </div>
    </NuxtLinkLocale>
</template>
<script setup lang="ts">
import { ListCheck, Kanban } from "lucide-vue-next";
const props = defineProps({
    id: Number,
    name: String,
    style: String,
});
</script>
