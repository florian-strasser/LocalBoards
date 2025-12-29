<template>
    <div class="flex justify-between mb-8">
        <h1 class="text-5xl text-primary"><slot /></h1>
        <button
            v-if="props.asButton"
            type="button"
            class="size-12 bg-primary text-white hover:bg-secondary flex justify-center items-center rounded-full"
            @click="handleClick"
            v-tooltip="props.tooltip"
        >
            <PlusIcon class="size-6" />
        </button>
        <NuxtLink
            v-if="!props.asButton && props.url"
            :to="props.url"
            class="size-12 bg-primary text-white hover:bg-secondary flex justify-center items-center rounded-full"
            v-tooltip="props.tooltip"
            ><PlusIcon class="size-6"
        /></NuxtLink>
    </div>
</template>
<script setup lang="ts">
import { PlusIcon } from "@heroicons/vue/24/solid";

const emit = defineEmits(["section-header-button-clicked"]);

const props = defineProps({
    url: String,
    asButton: Boolean,
    tooltip: String,
});

const handleClick = () => {
    emit("section-header-button-clicked");
};
</script>
