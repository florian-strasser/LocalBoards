<template>
    <div v-if="data.boards.length > 0" class="mt-12">
        <h2 class="text-5xl text-primary dark:text-white mb-5">
            {{ $t("sharedBoards") }}
        </h2>
        <div
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8"
        >
            <BoardTile
                v-for="item in data.boards"
                :id="item.id"
                :name="item.name"
                :style="item.style"
            />
        </div>
    </div>
</template>
<script setup lang="ts">
const props = defineProps({
    userID: String,
});

const { data, error } = await useFetch("/api/data/boards", {
    method: "POST",
    body: { userId: props.userID, shared: true },
});
if (error.value) {
    throw createError({
        status: 500,
        statusText: "Can't connect to the database",
    });
}
</script>
