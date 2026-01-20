<template>
    <div
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8"
    >
        <BoardTile
            v-for="item in data.boards"
            :id="item.id"
            :name="item.name"
            :style="item.style"
        />
        <button
            type="button"
            class="bg-white dark:bg-slate cursor-pointer text-primary hover:bg-secondary hover:text-white min-h-48 flex flex-col justify-center items-center rounded-lg"
            @click="handleClick"
        >
            <Plus class="size-10" />
        </button>
    </div>
</template>
<script setup lang="ts">
import { Plus } from "lucide-vue-next";
const props = defineProps({
    userID: String,
});

const emit = defineEmits(["new-board-button-clicked"]);

const { data, error } = await useFetch("/api/data/boards", {
    method: "POST",
    body: { userId: props.userID },
});
if (error.value) {
    throw createError({
        status: 500,
        statusText: "Can't connect to the database",
    });
}

const handleClick = () => {
    emit("new-board-button-clicked");
};
</script>
