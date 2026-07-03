<template>
    <div ref="root" class="relative">
        <div @click="toggle">
            <slot name="trigger" :open="open" />
        </div>
        <div
            v-if="open"
            class="absolute z-50 mt-2 rounded-xl border border-gray/20 dark:border-white/15 bg-white dark:bg-slate shadow-xl p-4 text-left"
            :class="align === 'right' ? 'right-0' : 'left-0'"
        >
            <slot :close="close" />
        </div>
    </div>
</template>
<script setup lang="ts">
// A lightweight click-to-open popover used for the Trello-style card metadata
// menus. Closes on an outside click or Escape. The default slot receives a
// `close` function so menu items can dismiss it after acting.
const props = defineProps({
    align: { type: String, default: "left" },
});

const open = ref(false);
const root = ref(null);

const toggle = () => (open.value = !open.value);
const close = () => (open.value = false);

const onDocMouseDown = (e) => {
    if (open.value && root.value && !root.value.contains(e.target)) close();
};
const onKeydown = (e) => {
    // Swallow the Escape so it closes the popover without also closing the
    // surrounding card modal.
    if (e.key === "Escape" && open.value) {
        e.stopPropagation();
        close();
    }
};

onMounted(() => {
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
    document.removeEventListener("mousedown", onDocMouseDown);
    document.removeEventListener("keydown", onKeydown);
});
</script>
