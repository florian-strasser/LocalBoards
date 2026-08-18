<template>
  <div class="ui bc" aria-hidden="true">
    <!-- A board tile as the dashboard draws it — name plate bottom left, the
         people on it bottom right — working its way through the twelve presets
         the app ships, with the picker below marking each one as it comes
         round. The colours are `BOARD_COLORS` from the app verbatim. -->
    <div class="bc__tile">
      <div class="bc__row">
        <span class="bc__name">Product Roadmap</span>
        <span class="bc__people">
          <span class="ui-avatar bc__face">BS</span>
          <span class="ui-avatar bc__face">AM</span>
        </span>
      </div>
    </div>

    <div class="bc__swatches">
      <span
        v-for="(color, index) in colors"
        :key="color"
        class="bc__swatch"
        :style="{
          background: color,
          // A negative delay starts the animation part-way in, so this is the
          // point in the cycle the ring lights up — half a step early, which
          // centres it on the moment the tile is actually showing that colour.
          animationDelay: `${(((index - 0.5) / colors.length - 1) * cycle).toFixed(2)}s`,
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// Kept in step with the CSS below by hand — twelve stops there, twelve entries
// here. Every one of them clears 4.5:1 against the plate drawn on it, which is
// why the name never has to change colour to stay readable.
const colors = [
  "#3f3f46",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#a21caf",
  "#e11d48",
  "#dc2626",
  "#c2410c",
  "#b45309",
  "#15803d",
  "#0f766e",
  "#0e7490",
];
const cycle = 24;
</script>
