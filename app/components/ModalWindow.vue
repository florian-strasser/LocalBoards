<template>
    <div
        :class="{ 'transform translate-x-full': !visible }"
        class="fixed top-0 left-0 w-full h-screen z-40 flex flex-col justify-center overflow-hidden"
    >
        <motion.div
            class="absolute top-0 left-0 w-full h-full bg-black/50"
            :style="{ opacity: backdropOpacity }"
            @click="closeModal"
        />
        <!-- The whole card scrolls (not an inner region). The enter/exit
             transform sits on THIS element, not on the card inside it: this is
             the scroll container, so its padding edge is the clip boundary, and
             a card animating past it would simply be cut off. Moving the
             container instead carries its contents along untouched. -->
        <motion.div
            class="relative w-full max-h-full py-8 overflow-y-auto overflow-x-hidden"
            :style="{ y, opacity: cardOpacity }"
            @click.self="closeModal"
        >
            <div class="relative w-full max-w-lg mx-auto">
                <div
                    class="absolute top-0 right-0 w-12 transform sm:translate-x-1/2 -translate-y-1/2 z-30"
                >
                    <button
                        type="button"
                        @click="closeModal"
                        class="flex justify-center items-center bg-primary text-white hover:bg-primary-hover size-12 rounded-full"
                    >
                        <X class="size-5" stroke-width="2" />
                    </button>
                </div>
                <div
                    class="bg-white dark:bg-slate shadow-xl p-8 rounded-lg text-gray text-center"
                >
                    <slot />
                </div>
            </div>
        </motion.div>
    </div>
</template>
<script setup lang="ts">
import { X } from "lucide-vue-next";
import { motion, useMotionValue, animate } from "motion-v";

const props = defineProps({
    hideClose: Boolean,
});

const open = defineModel();


// Enter: card rises from below (y 32 → 0) and fades in; the backdrop fades in.
// Exit: card continues upward (0 → -32) and fades out; the backdrop fades out.
// Driven imperatively so the start position resets on every open (a single
// reactive :animate can't re-enter from the bottom after exiting upward).
const ENTER_Y = 32;
const EXIT_Y = -32;
const DURATION = 0.4;
// The card fades out in a little over half the time the backdrop takes.
const CARD_EXIT_DURATION = 0.22;
const EASE = [0.22, 1, 0.36, 1];
const y = useMotionValue(ENTER_Y);
const cardOpacity = useMotionValue(0);
const backdropOpacity = useMotionValue(0);
// Keep the modal in the DOM/on-screen through the exit animation.
const visible = ref(false);
let hideTimer;

const applyState = (isOpen, animated) => {
    clearTimeout(hideTimer);
    if (isOpen) {
        visible.value = true;
        if (animated) {
            y.set(ENTER_Y);
            cardOpacity.set(0);
            animate(y, 0, { duration: DURATION, ease: EASE });
            animate(cardOpacity, 1, { duration: DURATION, ease: EASE });
            animate(backdropOpacity, 1, { duration: DURATION, ease: EASE });
        } else {
            // Shown immediately (e.g. a card opened straight from the URL).
            y.set(0);
            cardOpacity.set(1);
            backdropOpacity.set(1);
        }
    } else if (animated && visible.value) {
        // The card leaves faster than the backdrop. A scrolled dialog is clipped
        // to a hard-edged rectangle by its scroll container, and if it were still
        // faintly visible once the backdrop had gone it would read as a torn-off
        // fragment floating over the board. Fading it out first means the board
        // is still dimmed for as long as any of the card can be seen.
        animate(y, EXIT_Y, { duration: DURATION, ease: EASE });
        animate(cardOpacity, 0, { duration: CARD_EXIT_DURATION, ease: EASE });
        animate(backdropOpacity, 0, { duration: DURATION, ease: EASE });
        hideTimer = setTimeout(() => (visible.value = false), DURATION * 1000);
    } else {
        visible.value = false;
        y.set(ENTER_Y);
        cardOpacity.set(0);
        backdropOpacity.set(0);
    }
};

// Set the initial state without animating; animate on later changes.
onMounted(() => applyState(!!open.value, false));
watch(
    () => open.value,
    (isOpen) => applyState(isOpen, true),
);

// Register this modal in the shared open-count so the rest of the app can lock
// the page behind it. Lock body scroll whenever any modal is open.
const modal = useModalOpen();
let counted = false;
const syncCount = (isOpen) => {
    if (isOpen && !counted) {
        modal.add();
        counted = true;
    } else if (!isOpen && counted) {
        modal.remove();
        counted = false;
    }
};
// Driven by `visible`, not `open`: the modal stays on screen through its exit
// animation, so releasing the lock the moment `open` flips restores the page's
// scrollbar while the modal's own one is still there — two scrollbars for the
// length of the animation.
watch(() => visible.value, syncCount, { immediate: true });
watch(
    modal.isOpen,
    (locked) => {
        if (import.meta.client) {
            setBodyScrollLock(locked);
        }
    },
    { immediate: true },
);

const handleEscKey = (event) => {
    if (event.key === "Escape") {
        closeModal();
    }
};

const closeModal = () => {
    open.value = false;
};

onMounted(() => {
    window.addEventListener("keydown", handleEscKey);
});

onUnmounted(() => {
    syncCount(false);
    window.removeEventListener("keydown", handleEscKey);
});
</script>
