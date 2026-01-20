<template>
    <div
        v-if="open"
        class="fixed top-0 left-0 w-full flex flex-col justify-center h-screen z-40"
    >
        <div
            class="absolute top-0 left-0 w-full h-full bg-black/50"
            @click="open = false"
        />
        <div
            class="relative w-full max-h-full p-8 overflow-auto pointer-events-none"
        >
            <div
                class="relative w-full max-w-lg mx-auto bg-white dark:bg-slate px-8 py-7 pointer-events-auto rounded-lg text-gray text-center"
            >
                <button
                    @click="open = false"
                    class="absolute top-0 right-0 size-10 flex justify-center items-center rounded-full bg-primary text-white hover:bg-secondary transform translate-x-1/2 -translate-y-1/2"
                >
                    <X class="size-5" />
                </button>
                <slot />
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { X } from "lucide-vue-next";
const open = defineModel();

const handleEscKey = (event) => {
    if (event.key === "Escape") {
        open.value = false;
    }
};

onMounted(() => {
    window.addEventListener("keydown", handleEscKey);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleEscKey);
});
</script>
