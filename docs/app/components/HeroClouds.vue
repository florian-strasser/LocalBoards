<template>
  <div ref="root" class="clouds" aria-hidden="true">
    <!--
      Two clouds, one either side of the screenshot, as in the draft — not a
      repeating band. They sit behind the product shot and are allowed to run
      off the edges of the viewport, which is what makes them read as scenery
      rather than as decoration placed on the page.

      `mix-blend-mode: screen` — "Negativ multiplizieren" in Affinity — maps the
      artwork's black field to transparent and leaves the white untouched, so
      the photograph needs no cut-out mask. It only works over a lit background,
      which is what the sky gradient behind it provides.
    -->
    <Motion
      as="img"
      :src="src"
      alt=""
      class="clouds__cloud clouds__cloud--left"
      :style="{ y: leftY, rotate: leftRotate }"
    />
    <Motion
      as="img"
      :src="src"
      alt=""
      class="clouds__cloud clouds__cloud--right"
      :style="{ y: rightY, rotate: rightRotate, scaleX: -1 }"
    />
  </div>
</template>

<script setup lang="ts">
import { useScroll, useTransform } from "motion-v";

defineProps({
  src: { type: String, default: "/images/cloud.webp" },
});

const root = useTemplateRef<HTMLElement>("root");

// Driven by this section's own progress through the viewport rather than by
// absolute page scroll, so it behaves the same wherever the hero sits.
const { scrollYProgress } = useScroll({
  target: root,
  offset: ["start start", "end start"],
});

// Each cloud sinks and turns a little, in opposite directions, so the pair
// never looks like one image cut in half. The rotation is deliberately small —
// a couple of degrees reads as drift; more reads as a spinning sticker.
const leftY = useTransform(scrollYProgress, [0, 1], [0, 170]);
const rightY = useTransform(scrollYProgress, [0, 1], [0, 240]);
const leftRotate = useTransform(scrollYProgress, [0, 1], [0, -4]);
const rightRotate = useTransform(scrollYProgress, [0, 1], [0, 3]);
</script>

<style scoped>
.clouds {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.clouds__cloud {
  position: absolute;
  width: clamp(28rem, 46vw, 162rem);
  height: auto;
  mix-blend-mode: screen;
  will-change: transform;
  user-select: none;
}
/* Anchored past the edges so neither cloud shows a straight cut where the
   image ends, and set low enough to sit beside the screenshot rather than
   behind the headline. */
.clouds__cloud--left {
  left: -16%;
  bottom: -10%;
}
/* The horizontal flip is set through Motion (`scaleX: -1`) rather than here:
   Motion composes the element's `transform` from its own style keys, so a CSS
   transform on the same element would simply be overwritten. */
.clouds__cloud--right {
  right: -17%;
  bottom: -4%;
}

@media (prefers-reduced-motion: reduce) {
  .clouds__cloud {
    transform: none;
  }
}
</style>
