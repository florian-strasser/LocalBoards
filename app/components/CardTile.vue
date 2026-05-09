<template>
    <button
        :key="props.card.id"
        :data-card-id="props.card.id"
        type="button"
        class="bg-dark/10 dark:bg-white/10 text-dark dark:text-white text-left p-2 rounded-md w-full"
        @click="openModal(props.card.id)"
    >
        <div class="flex gap-x-2">
            <div
                class="w-6 h-6 rounded-full flex justify-center items-center shrink-0 grow-0"
                :class="{
                    'border-2 border-primary bg-primary text-white':
                        props.card.status,
                    'border-2 border-gray': !props.card.status,
                }"
            >
                <Check v-if="props.card.status" class="size-4" />
            </div>
            <div class="shrink grow">
                <h3 class="font-bold">
                    {{ props.card.name }}
                </h3>
            </div>
        </div>
        <div
            v-if="props.card.commentCount || props.card.attachmentCount"
            class="pl-8 flex items-center text-sm gap-x-3 flex-wrap text-gray"
        >
            <div class="flex gap-x-1.5 shrink-0" v-if="props.card.commentCount">
                <MessageSquareText class="size-4 shrink-0 grow-0" />
                <div class="shrink-0 grow-0">
                    {{ props.card.commentCount }}
                </div>
            </div>
            <div
                class="flex gap-x-1.5 shrink-0"
                v-if="props.card.attachmentCount"
            >
                <Paperclip class="size-4 shrink-0 grow-0" />
                <div class="shrink-0 grow-0">
                    {{ props.card.attachmentCount }}
                </div>
            </div>
        </div>
    </button>
</template>
<script setup lang="ts">
import { Check, MessageSquareText, Paperclip } from "lucide-vue-next";
const cardModal = defineModel();
const props = defineProps({
    card: Object,
});
const openModal = (modalId) => {
    cardModal.value = modalId;
    document.body.style.overflow = "hidden";
};
</script>
