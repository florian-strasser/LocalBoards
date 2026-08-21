<template>
    <div class="relative">
        <button
            type="button"
            @click="open = !open"
            :aria-expanded="open"
            aria-haspopup="menu"
            v-tooltip="props.tooltip"
            class="flex cursor-pointer items-center justify-center"
            :class="
                plain
                    ? 'hover:text-primary-hover'
                    : 'size-12 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white dark:bg-white/10 dark:text-white'
            "
        >
            <MoreVertical class="size-5" />
        </button>

        <template v-if="open">
            <!-- Full-screen catcher: a click anywhere outside closes the menu.
                 Above the board tiles (which paint their content at z-20) so an
                 outside click always lands here first. -->
            <div class="fixed inset-0 z-40" @click="open = false"></div>
            <!-- Clicking any item closes the menu (@click on the panel). z-50 so
                 it sits above the board tiles' z-20 content. -->
            <div
                role="menu"
                class="absolute right-0 z-50 mt-2 min-w-52 rounded-xl border border-gray/15 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-slate"
                @click="open = false"
            >
                <slot />
            </div>
        </template>
    </div>
</template>
<script setup lang="ts">
import { MoreVertical } from "lucide-vue-next";

const props = defineProps({
    tooltip: String,
    // The button without its filled circle, for places that cannot carry a
    // 48-pixel control: beside a card's title, where it stands in for what used
    // to be a bare delete icon and has to keep that weight. The menu it opens
    // is the same one the board and dashboard headers open.
    plain: Boolean,
});

const open = ref(false);

// Close on Escape for keyboard users.
const onKey = (e) => {
    if (e.key === "Escape") open.value = false;
};
onMounted(() => document.addEventListener("keydown", onKey));
onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
</script>
