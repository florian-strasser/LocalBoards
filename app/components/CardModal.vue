<template>
    <div v-if="data" class="card-modal text-left">
        <div v-if="deleteModal" class="w-full">
            <h2 class="text-4xl text-primary text-center mb-4">
                {{ $t("deleteCardTitle") }}
            </h2>
            <button
                @click="deleteCard"
                type="button"
                class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
            >
                {{ $t("deleteCardBtn") }}
            </button>
        </div>
        <div v-else>
            <div class="flex items-center gap-3 mb-4">
                <button
                    type="button"
                    :disabled="!props.writeAccess"
                    class="flex items-center justify-center size-7 rounded-full shrink-0 grow-0"
                    @click="toggleStatus"
                    :class="{
                        'bg-primary border-2 border-primary text-white':
                            currentStatus,
                        'border-2 border-gray hover:border-primary text-white dark:text-slate':
                            !currentStatus && writeAccess,
                        'border-2 border-gray text-white dark:text-slate':
                            !currentStatus && !writeAccess,
                    }"
                >
                    <Check class="size-4" />
                </button>
                <div class="grow shrink">
                    <input
                        type="text"
                        v-model="name"
                        @blur="saveCard"
                        class="text-2xl font-bold text-primary dark:text-white w-full"
                    />
                </div>
                <div class="grow-0 shrink-0">
                    <button
                        v-if="writeAccess"
                        type="button"
                        class="block hover:text-secondary"
                        @click="deleteModal = true"
                    >
                        <Trash2 class="size-5" />
                    </button>
                </div>
            </div>
            <div class="mb-4">
                <CardEditor v-if="writeAccess" v-model="content" />
                <div v-else class="wysiwyg-wrapper" v-html="content" />
            </div>
            <CommentSection
                :cardID="props.cardID"
                :writeAccess="props.writeAccess"
            />
        </div>
    </div>
    <div v-else-if="error">Error loading card: {{ error }}</div>
    <div v-else>Loading...</div>
</template>
<script setup lang="ts">
import { socket } from "~/lib/socket";
import { Check, Trash2, X } from "lucide-vue-next";
const props = defineProps({
    cardID: Number,
    boardID: Number,
    writeAccess: Boolean,
});

const nuxtApp = useNuxtApp();
const emits = defineEmits(["card-updated", "card-deleted"]);

const boxOpen = defineModel();

const { data, error } = await useFetch(`/api/data/card?cardID=${props.cardID}`);

const name = ref(data.value.card.name);
const content = ref(data.value.card.content);
const currentStatus = ref(data.value.card.status);

const deleteModal = ref(false);

const toggleStatus = () => {
    currentStatus.value = !currentStatus.value;
    saveCard();
};

// Function to save the card data
const saveCard = async () => {
    try {
        const response = await $fetch(`/api/data/card`, {
            method: "PUT",
            body: {
                cardID: props.cardID,
                name: name.value,
                content: content.value,
                status: currentStatus.value,
            },
        });
        emits("card-updated", response.card);
        socket.emit("cardUpdated", {
            boardId: props.boardID,
            card: response.card,
        });
    } catch (err) {
        console.error("Failed to save card:", err);
    }
};

const deleteCard = async () => {
    try {
        const response = await $fetch(`/api/data/card`, {
            method: "DELETE",
            body: {
                cardID: props.cardID,
                name: name.value,
                content: content.value,
                status: currentStatus.value,
            },
        });

        await nuxtApp.callHook("app:toast", {
            message: $t("cardDeleted"),
        });
        boxOpen.value = false;
        emits("card-deleted", data.value.card);
        socket.emit("cardDeleted", {
            boardId: props.boardID,
            card: response.card,
        });
    } catch (err) {
        console.error("Failed to deleted card:", err);
    }
};

// Watch for changes in name, content, or currentStatus
watch(
    [content],
    () => {
        saveCard();
    },
    { deep: true },
);
</script>
