<template>
    <div
        class="block space-y-3 sm:flex sm:space-y-0 sm:justify-between items-center"
        :class="{ 'pt-4 mt-4 border-t border-gray/10': index > 0 }"
    >
        <div class="grow shrink">
            <NuxtLink
                :to="'/edit-user/' + props.id"
                class="hover:text-secondary"
                >{{ props.email }}</NuxtLink
            >
        </div>
        <div class="flex shrink-0 grow-0 gap-x-3">
            <button
                @click="model = props.id"
                type="button"
                v-tooltip="$t('delete')"
                class="size-12 rounded-full flex bg-primary hover:bg-secondary text-white justify-center items-center cursor-pointer"
            >
                <Trash2 class="size-6" />
            </button>
            <NuxtLink
                :to="'/edit-user/' + props.id"
                v-tooltip="$t('edit')"
                class="size-12 rounded-full flex bg-primary hover:bg-secondary text-white justify-center items-center cursor-pointer"
            >
                <ArrowRight class="size-6" />
            </NuxtLink>
        </div>
    </div>
</template>
<script setup lang="ts">
import { Trash2, ArrowRight } from "lucide-vue-next";
const model = defineModel();
const props = defineProps({
    id: String,
    name: String,
    email: String,
    index: Number,
});
</script>
