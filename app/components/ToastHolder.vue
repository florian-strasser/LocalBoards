<template>
    <!-- A plain stack: every toast is its own card, oldest at the top and newest
         nearest the corner. No collapsing and no measuring — several toasts at
         once is rare enough that a straight column is the right amount of
         machinery for it. The container ignores pointer events so the gaps
         between cards cannot swallow clicks on whatever is underneath. -->
    <TransitionGroup
        name="toast"
        tag="div"
        class="pointer-events-none fixed bottom-8 right-8 z-50 flex flex-col items-end gap-y-2"
    >
        <div
            v-for="toast in toasts"
            :key="toast.id"
            class="pointer-events-auto bg-white dark:bg-slate shadow-lg px-6 py-3 rounded-xl"
            @mouseenter="hold"
            @mouseleave="release"
        >
            <div class="flex gap-x-2 items-start">
                <div class="w-5 shrink-0 grow-0 pt-0.5">
                    <!-- The ring is the countdown: it closes as the toast runs
                         out, and it is the same clock that dismisses it, so the
                         two cannot disagree. `pathLength="1"` normalises the
                         circumference so the animation runs 0 → 1 whatever the
                         radius; `stroke-dasharray="0 1"` keeps it invisible for
                         the frame before Motion takes the element over. -->
                    <svg
                        class="size-5 -rotate-90 text-primary"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                    >
                        <circle cx="10" cy="10" r="3" fill="currentColor" />
                        <circle
                            :ref="(el) => setRing(toast.id, el as SVGCircleElement | null)"
                            cx="10"
                            cy="10"
                            r="8"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            pathLength="1"
                            stroke-dasharray="0 1"
                        />
                    </svg>
                </div>
                <div class="grow shrink">{{ toast.message }}</div>
            </div>
        </div>
    </TransitionGroup>
</template>
<script setup lang="ts">
import { animate } from "motion-v";

// How long a toast stays up when nobody is reading it.
const SECONDS = 5;

type Toast = { id: number; message: string };
type Controls = { pause: () => void; play: () => void; stop: () => void };

const nuxtApp = useNuxtApp();
const toasts = ref<Toast[]>([]);
const clocks = new Map<number, Controls>();
let nextId = 1;

const remove = (id: number) => {
    clocks.get(id)?.stop();
    clocks.delete(id);
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
};

// A ring starts counting the moment its element exists, rather than on a timer
// of its own, so the picture and the dismissal cannot drift apart. Motion is
// still what draws it; only the stacking went back to plain CSS.
const setRing = (id: number, el: SVGCircleElement | null) => {
    if (!el || clocks.has(id)) return;

    const controls = animate(
        el,
        { pathLength: [0, 1] },
        { duration: SECONDS, ease: "linear" },
    ) as unknown as Controls;
    clocks.set(id, controls);

    (controls as any).finished
        ?.then(() => remove(id))
        .catch(() => {
            /* stopped on unmount */
        });
};

// Every toast gets its own card. Two of the same message make two cards: they
// are two things that happened, and collapsing them looked exactly like the
// overwriting this replaced.
nuxtApp.hook("app:toast", (payload: { message: string }) => {
    toasts.value = [...toasts.value, { id: nextId++, message: payload.message }];
});

// Reading takes longer than five seconds sometimes — especially an error with a
// URL in it. The pointer stops every clock, not only the one beneath it, so the
// stack cannot rearrange itself while a message is being read.
const hold = () => clocks.forEach((clock) => clock.pause());
const release = () => clocks.forEach((clock) => clock.play());

onBeforeUnmount(() => clocks.forEach((clock) => clock.stop()));
</script>
