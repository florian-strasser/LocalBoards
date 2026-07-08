<template>
    <button
        :key="props.card.id"
        :data-card-id="props.card.id"
        type="button"
        class="bg-dark/10 dark:bg-white/10 text-dark dark:text-white text-left p-2 rounded-md w-full"
        :class="{ 'ring-2 ring-primary': props.hasUnread }"
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
            v-if="
                props.card.commentCount ||
                props.card.attachmentCount ||
                props.card.dueDate ||
                props.card.assignee
            "
            class="pl-8 mt-1 flex items-center text-sm gap-x-3 flex-wrap text-gray"
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
            <div
                v-if="props.card.dueDate"
                class="flex gap-x-1.5 shrink-0 items-center"
                :class="{ 'text-secondary font-semibold': isOverdue }"
            >
                <Clock class="size-4 shrink-0 grow-0" />
                <span class="shrink-0 grow-0">{{ dueDateLabel }}</span>
            </div>
            <div
                v-if="props.card.assignee"
                class="ml-auto shrink-0"
                v-tooltip="props.card.assigneeName || ''"
            >
                <img
                    v-if="props.card.assigneeImage"
                    :src="props.card.assigneeImage"
                    class="w-6 h-6 rounded-full object-cover"
                    :alt="props.card.assigneeName || ''"
                />
                <div
                    v-else
                    class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs"
                >
                    {{ (props.card.assigneeName || "?").substring(0, 1) }}
                </div>
            </div>
        </div>
    </button>
</template>
<script setup lang="ts">
import { Check, MessageSquareText, Paperclip, Clock } from "lucide-vue-next";
const cardModal = defineModel();
const props = defineProps({
    card: Object,
    // Whether this card has unread notifications for the current user.
    hasUnread: { type: Boolean, default: false },
});

const isOverdue = computed(
    () =>
        !!props.card.dueDate &&
        !props.card.status &&
        new Date(props.card.dueDate).getTime() < Date.now(),
);

const dueDateLabel = computed(() => {
    if (!props.card.dueDate) return "";
    return new Date(props.card.dueDate).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
});
const openModal = (modalId) => {
    cardModal.value = modalId;
    document.body.style.overflow = "hidden";
};
</script>
