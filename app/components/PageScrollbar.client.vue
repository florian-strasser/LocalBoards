<template>
    <Teleport to="body">
        <div
            ref="track"
            class="page-scrollbar"
            :class="{ 'page-scrollbar--visible': visible }"
            @pointerdown.self="onTrackClick"
        >
            <motion.div
                class="page-scrollbar__thumb"
                :style="{ height: thumbH + 'px', y }"
                drag="y"
                :dragConstraints="{ top: 0, bottom: maxThumb }"
                :dragElastic="0"
                :dragMomentum="false"
                @pointerdown="onThumbDown"
            />
        </div>
    </Teleport>
</template>
<script setup>
import { motion, useMotionValue } from "motion-v";

// App-wide custom scrollbar for the page (document) scroll — replaces the
// native bar. Hidden while a modal is open (the page is locked behind it and
// the modal brings its own ModalScrollbar).
const { isOpen: anyModalOpen } = useModalOpen();

const track = ref(null);
const overflowing = ref(false);
const thumbH = ref(40);
const maxThumb = ref(0);
const y = useMotionValue(0);
let dragging = false;

const visible = computed(() => overflowing.value && !anyModalOpen.value);

const scroller = () =>
    document.scrollingElement || document.documentElement;

const measure = () => {
    const el = scroller();
    const tr = track.value;
    if (!el || !tr) {
        overflowing.value = false;
        return;
    }
    const scrollHeight = el.scrollHeight;
    const clientHeight = window.innerHeight;
    const scrollTop = el.scrollTop;
    if (scrollHeight <= clientHeight + 1) {
        overflowing.value = false;
        return;
    }
    overflowing.value = true;
    const trackH = tr.clientHeight;
    const h = Math.max(40, (clientHeight / scrollHeight) * trackH);
    thumbH.value = h;
    maxThumb.value = Math.max(0, trackH - h);
    const maxScroll = scrollHeight - clientHeight;
    if (!dragging) {
        y.set(maxScroll > 0 ? (scrollTop / maxScroll) * maxThumb.value : 0);
    }
};

const unsub = y.on("change", (val) => {
    if (!dragging) return;
    const el = scroller();
    if (!el || maxThumb.value <= 0) return;
    const maxScroll = el.scrollHeight - window.innerHeight;
    el.scrollTop = (val / maxThumb.value) * maxScroll;
});

const onThumbDown = () => {
    dragging = true;
    document.body.classList.add("no-select");
    const up = () => {
        dragging = false;
        document.body.classList.remove("no-select");
        measure();
        window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointerup", up);
};

const onTrackClick = (e) => {
    const el = scroller();
    const tr = track.value;
    if (!el || !tr || maxThumb.value <= 0) return;
    const rect = tr.getBoundingClientRect();
    const targetY = e.clientY - rect.top - thumbH.value / 2;
    const clamped = Math.min(Math.max(targetY, 0), maxThumb.value);
    const maxScroll = el.scrollHeight - window.innerHeight;
    el.scrollTop = (clamped / maxThumb.value) * maxScroll;
};

let ro = null;
const onScroll = () => measure();

onMounted(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    // Re-measure when the page's content size changes (route change, cards
    // added, board loaded, …).
    ro = new ResizeObserver(() => measure());
    ro.observe(document.body);
    nextTick(measure);
});
onBeforeUnmount(() => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", measure);
    ro?.disconnect();
    unsub?.();
});

// The page becomes scrollable again once a modal closes.
watch(anyModalOpen, () => nextTick(measure));
</script>
