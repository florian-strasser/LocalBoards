<template>
    <div v-if="data" class="card-modal text-left">
        <div class="flex items-center gap-3 mb-4">
            <button
                type="button"
                :disabled="!props.writeAccess"
                class="flex items-center justify-center size-7 rounded-full shrink-0 grow-0 text-white"
                @click="toggleStatus"
                :class="{
                    'bg-secondary': currentStatus,
                    'border-2 border-gray/30 hover:border-secondary':
                        !currentStatus && writeAccess,
                    'border-2 border-gray/30': !currentStatus && !writeAccess,
                }"
            >
                <Check class="size-4" />
            </button>
            <div class="grow shrink">
                <input
                    type="text"
                    v-model="name"
                    @blur="saveCard"
                    class="text-2xl font-bold text-primary w-full"
                />
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
    <div v-else-if="error">Error loading card: {{ error }}</div>
    <div v-else>Loading...</div>
</template>
<script setup lang="ts">
import { Check } from "lucide-vue-next";
const props = defineProps({
    cardID: Number,
    writeAccess: Boolean,
});

const emit = defineEmits(["card-updated"]);

const { data, error } = await useFetch(`/api/data/card?cardID=${props.cardID}`);

const name = ref(data.value.card.name);
const content = ref(data.value.card.content);
const currentStatus = ref(data.value.card.status);

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
        emit("card-updated", response.card);
    } catch (err) {
        console.error("Failed to save card:", err);
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
