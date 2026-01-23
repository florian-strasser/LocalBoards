<template>
    <button
        :key="card.id"
        :data-card-id="card.id"
        type="button"
        class="bg-dark/10 dark:bg-white/10 text-dark dark:text-white text-left p-2 rounded-md w-full"
        @click="cardModal = card.id"
    >
        <div class="flex gap-x-2">
            <div
                class="w-6 h-6 rounded-full flex justify-center items-center shrink-0 grow-0"
                :class="{
                    'border-2 border-primary bg-primary text-white':
                        card.status,
                    'border-2 border-gray': !card.status,
                }"
            >
                <Check v-if="card.status" class="size-4" />
            </div>
            <div class="shrink grow">
                <h3 class="font-bold">
                    {{ card.name }}
                </h3>
            </div>
        </div>
    </button>
</template>
<script setup lang="ts">
import { Check } from "lucide-vue-next";
const cardModal = defineModel();
const props = defineProps({
    card: Object,
});
</script>
