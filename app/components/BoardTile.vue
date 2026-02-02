<template>
    <NuxtLinkLocale
        :to="'/board/' + props.id"
        class="relative rounded-lg overflow-clip group bg-primary"
    >
        <div
            class="relative z-20 flex flex-col gap-y-6 justify-between items-start min-h-48 px-6 py-5 group-hover:bg-secondary"
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
        </div>
        <img
            v-if="props.image"
            :src="props.image"
            :alt="props.name"
            class="absolute top-0 left-0 w-full h-full object-cover z-10"
        />
    </NuxtLinkLocale>
</template>
<script setup lang="ts">
import { ListCheck, Kanban } from "lucide-vue-next";
const props = defineProps({
    id: Number,
    name: String,
    style: String,
    image: String,
});
</script>
