<template>
  <FadeIn class="feature-tile" :amount="0.1">
    <div class="feature-tile__inner">
      <!-- The demo sits above the words on purpose: the point of this section
           is that you see the thing working before you read what it is. -->
      <div
        v-if="$slots.default"
        class="feature-tile__visual"
        :class="{ 'feature-tile__visual--tall': tall }"
      >
        <slot />
      </div>
      <div>
        <h3 class="text-dark font-medium text-lg">{{ title }}</h3>
        <p class="mt-1 text-gray">{{ text }}</p>
      </div>
    </div>
  </FadeIn>
</template>

<script setup lang="ts">
defineProps({
  title: { type: String, required: true },
  text: { type: String, required: true },
  // For the tiles wide enough to hold a whole board rather than one panel.
  tall: { type: Boolean, default: false },
});
</script>
