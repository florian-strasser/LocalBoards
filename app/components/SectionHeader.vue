<template>
    <div class="flex justify-between mb-8">
        <h1 v-if="!props.asH2" class="text-5xl text-primary"><slot /></h1>
        <h2 v-else class="text-5xl text-primary"><slot /></h2>
        <button
            v-if="props.asButton"
            type="button"
            class="size-12 bg-primary text-white hover:bg-secondary flex justify-center items-center rounded-full"
            @click="handleClick"
            v-tooltip="props.tooltip"
        >
            <Plus class="size-5" />
        </button>
        <NuxtLink
            v-if="!props.asButton && props.url"
            :to="props.url"
            class="size-12 bg-primary text-white hover:bg-secondary flex justify-center items-center rounded-full"
            v-tooltip="props.tooltip"
            ><Plus class="size-5"
        /></NuxtLink>
    </div>
</template>
<script setup lang="ts">
import { Plus } from "lucide-vue-next";

const emit = defineEmits(["section-header-button-clicked"]);

const props = defineProps({
    url: String,
    asButton: Boolean,
    tooltip: String,
    asH2: Boolean,
});

const handleClick = () => {
    emit("section-header-button-clicked");
};
</script>
