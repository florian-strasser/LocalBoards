<template>
    <Teleport to="body">
        <div
            ref="track"
            class="board-scrollbar"
            :class="{ 'board-scrollbar--visible': visible && !anyModalOpen }"
            @pointerdown.self="onTrackClick"
        >
            <motion.div
                class="board-scrollbar__thumb"
                :style="{ width: thumbW + 'px', x }"
                drag="x"
                :dragConstraints="{ left: 0, right: maxThumb }"
                :dragElastic="0"
                :dragMomentum="false"
                @pointerdown="onThumbDown"
            />
        </div>
    </Teleport>
</template>
<script setup>
import { motion, useMotionValue } from "motion-v";

// Custom horizontal scrollbar for the board areas, pinned to the bottom of the
// viewport so it's always reachable (unlike the native bar, which lives at the
// bottom of a tall page). Driven by the target scroll container's metrics; the
// thumb is a Motion draggable whose `x` is kept in sync with `scrollLeft`.
const props = defineProps({
    target: { type: Object, default: null },
});

// Hide the board scrollbar while a modal is open (the page behind is locked).
const { isOpen: anyModalOpen } = useModalOpen();

const track = ref(null);
const visible = ref(false);
const thumbW = ref(40);
const maxThumb = ref(0);
const x = useMotionValue(0);
let dragging = false;

const measure = () => {
    const el = props.target;
    const tr = track.value;
    if (!el || !tr) {
        visible.value = false;
        return;
    }
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth + 1) {
        visible.value = false;
        return;
    }
    visible.value = true;
    const trackW = tr.clientWidth;
    const w = Math.max(40, (clientWidth / scrollWidth) * trackW);
    thumbW.value = w;
    maxThumb.value = Math.max(0, trackW - w);
    const maxScroll = scrollWidth - clientWidth;
    // Reflect the scroll position on the thumb — unless the user is dragging it.
    if (!dragging) {
        x.set(maxScroll > 0 ? (scrollLeft / maxScroll) * maxThumb.value : 0);
    }
};

// Thumb dragged → scroll the board (only while actively dragging, so the
// scroll-driven x.set() above doesn't feed back into this).
const unsub = x.on("change", (val) => {
    if (!dragging) return;
    const el = props.target;
    if (!el || maxThumb.value <= 0) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollLeft = (val / maxThumb.value) * maxScroll;
});

const onThumbDown = () => {
    dragging = true;
    // Suppress text selection on the page while dragging the thumb.
    document.body.classList.add("no-select");
    const up = () => {
        dragging = false;
        document.body.classList.remove("no-select");
        measure(); // re-sync thumb to the final scroll position
        window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointerup", up);
};

// Click on the track (not the thumb) jumps the board to that position.
const onTrackClick = (e) => {
    const el = props.target;
    const tr = track.value;
    if (!el || !tr || maxThumb.value <= 0) return;
    const rect = tr.getBoundingClientRect();
    const targetX = e.clientX - rect.left - thumbW.value / 2;
    const clamped = Math.min(Math.max(targetX, 0), maxThumb.value);
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollLeft = (clamped / maxThumb.value) * maxScroll;
};

let ro = null;
let mo = null;
const onScroll = () => measure();

const attach = () => {
    const el = props.target;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    ro = new ResizeObserver(() => measure());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    mo = new MutationObserver(() => nextTick(measure));
    mo.observe(el, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    nextTick(measure);
};

const detach = () => {
    const el = props.target;
    if (el) el.removeEventListener("scroll", onScroll);
    ro?.disconnect();
    mo?.disconnect();
    ro = null;
    mo = null;
    window.removeEventListener("resize", measure);
};

watch(
    () => props.target,
    (n) => {
        detach();
        if (n) attach();
    },
);

onMounted(() => {
    if (props.target) attach();
});
onBeforeUnmount(() => {
    detach();
    unsub?.();
});
</script>
