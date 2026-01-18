<template>
    <transition name="fade">
        <div
            v-if="currentToast"
            class="fixed bottom-8 right-8 bg-white shadow-lg px-6 py-3 rounded-xl z-50"
        >
            <div class="flex gap-x-2 items-start">
                <div class="w-3 shrink-0 grow-0 pt-1.5">
                    <span class="relative flex size-3">
                        <span
                            class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-secondary"
                        ></span>
                        <span
                            class="relative inline-flex size-3 rounded-full bg-secondary"
                        ></span>
                    </span>
                </div>
                <div class="grow shrink">{{ currentToast }}</div>
            </div>
        </div>
    </transition>
</template>
<script setup lang="ts">
const nuxtApp = useNuxtApp();
const currentToast = ref(false);

nuxtApp.hook("app:toast", (payload) => {
    currentToast.value = payload.message;
    setTimeout(() => {
        currentToast.value = false;
    }, 5000);
});
</script>
