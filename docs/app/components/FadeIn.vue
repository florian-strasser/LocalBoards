<template>
  <Motion
    :as="as"
    :initial="{ opacity: 0, y: distance }"
    :while-in-view="{ opacity: 1, y: 0 }"
    :in-view-options="{ once: true, amount: amount }"
    :transition="{
      duration: duration,
      delay: delay,
      ease: ease,
    }"
  >
    <slot />
  </Motion>
</template>

<script setup lang="ts">
// The workhorse for everything that is not a headline: a short rise and fade
// the first time an element comes into view. `once` matters — content that
// re-animates every time you scroll past it is distracting on a page people
// scroll up and down.
defineProps({
  as: { type: String, default: "div" },
  delay: { type: Number, default: 0 },
  duration: { type: Number, default: 0.7 },
  // How far it travels. Small on purpose: the movement should register without
  // the reader noticing it happened.
  distance: { type: Number, default: 24 },
  // Fraction of the element that must be visible before it starts. A low value
  // suits tall blocks, which would otherwise wait until they are half past.
  amount: { type: Number, default: 0.2 },
  // The default is a hard expo-out: it lands almost immediately and spends the
  // rest of the duration easing the last few pixels, which is what makes a
  // small rise feel crisp. Raising `duration` on that curve stretches the
  // movement but barely slows the fade — anything that should visibly take its
  // time wants a gentler curve as well as a longer one.
  ease: {
    type: Array as () => number[],
    default: () => [0.16, 1, 0.3, 1],
  },
});
</script>
