<template>
    <!-- Teleported to <body> so the lightbox's fixed positioning is always
         relative to the viewport, even when it's rendered inside a modal whose
         open animation applies a transform (a transformed ancestor would
         otherwise become the containing block and reveal it off to the side). -->
    <Teleport to="body">
        <div
            :class="{ 'transform translate-x-full': !open }"
            class="fixed top-0 left-0 w-full flex flex-col justify-center h-screen z-40"
        >
            <div
                class="absolute top-0 left-0 w-full h-full bg-black/50"
                @click="closeModal"
            />
            <div class="relative w-full max-h-full py-8 overflow-auto">
                <div
                    class="fixed top-0 left-0 w-full h-full"
                    @click="closeModal"
                />
                <div
                    class="relative w-full mx-auto text-gray text-center"
                    :class="{
                        'max-w-2xl shadow-xl rounded-lg': !props.bare,
                        'max-w-none rounded-none': props.bare,
                    }"
                    @click="closeModal"
                >
                    <slot />
                </div>
            </div>
            <div class="absolute top-4 right-4 w-12 transform z-30">
                <button
                    type="button"
                    @click="closeModal"
                    class="flex justify-center items-center bg-primary text-white hover:bg-secondary size-12 rounded-full"
                >
                    <X class="size-5" stroke-width="2" />
                </button>
            </div>
        </div>
    </Teleport>
</template>
<script setup lang="ts">
import { X } from "lucide-vue-next";

const props = defineProps({
    hideClose: Boolean,
    bare: Boolean,
});

const open = defineModel();

const handleEscKey = (event) => {
    if (event.key === "Escape") {
        closeModal();
    }
};

const closeModal = () => {
    document.body.style.overflow = "auto";
    open.value = false;
};

onMounted(() => {
    window.addEventListener("keydown", handleEscKey);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleEscKey);
});
</script>
