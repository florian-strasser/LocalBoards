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
        <NuxtLink
            to="/board/new"
            class="bg-white text-primary hover:bg-secondary hover:text-white min-h-48 flex flex-col justify-center items-center rounded-lg"
        >
            <PlusIcon class="size-12" />
        </NuxtLink>
    </div>
</template>
<script setup lang="ts">
import { PlusIcon } from "@heroicons/vue/24/solid";
const props = defineProps({
    userID: String,
});
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
</script>
