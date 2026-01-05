<template>
    <div>
        <div v-if="!newCardCreation" class="pt-1">
            <button
                @click="createNewCard"
                type="button"
                class="bg-primary hover:bg-secondary px-4 py-2 flex gap-x-1 items-center rounded-lg text-white"
            >
                <PlusIcon class="size-5" /><span>Create new card</span>
            </button>
        </div>
        <form v-else @submit.prevent="createCard">
            <textarea
                v-model="newCardName"
                rows="2"
                ref="newCardInput"
                placeholder="Enter an card name"
                class="font-bold text-primary resize-none focus:outline-none w-full p-2 rounded-md bg-primary/10"
            />
            <div class="flex gap-x-1 mt-2">
                <input
                    type="submit"
                    class="bg-primary hover:bg-secondary px-4 py-2 rounded-lg text-white"
                    value="Create card"
                />
                <button
                    type="button"
                    @click="newCardCreation = false"
                    class="px-4 bg-primary/10 text-primary hover:bg-secondary hover:text-white rounded-lg"
                >
                    <XMarkIcon class="size-5" />
                </button>
            </div>
        </form>
    </div>
</template>
<script setup lang="ts">
import { socket } from "~/lib/socket";
import { PlusIcon, XMarkIcon } from "@heroicons/vue/24/outline";

const props = defineProps({
    boardID: Number,
    areaID: Number,
    userID: String,
});

const emits = defineEmits(["card-created"]);

const newCardCreation = ref(false);
const newCardName = ref("");
const newCardInput = ref(null);

const createNewCard = () => {
    newCardName.value = "";
    newCardCreation.value = true;
    nextTick(() => {
        if (newCardInput.value) {
            newCardInput.value.focus();
        }
    });
};
const createCard = async () => {
    try {
        const data = await $fetch("/api/data/card", {
            method: "POST",
            body: {
                areaId: props.areaID,
                name: newCardName.value,
                status: false, // Default status is false
                user: props.userID,
            },
        });
        if (data.card) {
            newCardName.value = "";
            newCardCreation.value = false;
            emits("card-created", data.card);
            socket.emit("cardCreated", {
                boardId: props.boardID,
                card: data.card,
            });
        }
    } catch (err) {
        console.error("Error creating card:", err);
    }
};
</script>
