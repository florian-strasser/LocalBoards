<template>
    <Teleport to="body">
        <div
            ref="track"
            class="modal-scrollbar"
            :class="{ 'modal-scrollbar--visible': visible }"
            @pointerdown.self="onTrackClick"
        >
            <motion.div
                class="modal-scrollbar__thumb"
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

// Custom vertical scrollbar for a modal's scroll container — the sibling of the
// board's bottom scrollbar. Fades in (CSS) when the modal is open and its
// content overflows; the thumb is a Motion draggable synced to `scrollTop`.
const props = defineProps({
    target: { type: Object, default: null },
    active: { type: Boolean, default: false },
});

const track = ref(null);
const overflowing = ref(false);
const thumbH = ref(40);
const maxThumb = ref(0);
const y = useMotionValue(0);
let dragging = false;

const visible = computed(() => props.active && overflowing.value);

const measure = () => {
    const el = props.target;
    const tr = track.value;
    if (!el || !tr) {
        overflowing.value = false;
        return;
    }
    const { scrollHeight, clientHeight, scrollTop } = el;
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
    const el = props.target;
    if (!el || maxThumb.value <= 0) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    el.scrollTop = (val / maxThumb.value) * maxScroll;
});

const onThumbDown = () => {
    dragging = true;
    // Suppress text selection on the page while dragging the thumb.
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
    const el = props.target;
    const tr = track.value;
    if (!el || !tr || maxThumb.value <= 0) return;
    const rect = tr.getBoundingClientRect();
    const targetY = e.clientY - rect.top - thumbH.value / 2;
    const clamped = Math.min(Math.max(targetY, 0), maxThumb.value);
    const maxScroll = el.scrollHeight - el.clientHeight;
    el.scrollTop = (clamped / maxThumb.value) * maxScroll;
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
// Re-measure when the modal opens/closes (its content becomes laid out).
watch(
    () => props.active,
    () => nextTick(measure),
);

onMounted(() => {
    if (props.target) attach();
});
onBeforeUnmount(() => {
    detach();
    unsub?.();
});
</script>
