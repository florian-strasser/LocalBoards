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

<style scoped>
.bc {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.bc__tile {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  /* Takes the whole tile bar the picker below it, which is what a board tile
     does on the dashboard — it is the thing you are looking at, not a swatch. */
  flex: 1 1 auto;
  min-height: 7rem;
  padding: 0.9em;
  border-radius: 0.55rem;
  animation: bc-tile 24s linear infinite;
}
.bc__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.6em;
}
/* The name plate is the tile's foreground colour with the board's own colour
   as its text, so the pair inverts together — exactly as `BoardTile` does it. */
.bc__name {
  padding: 0.45em 0.7em;
  border-radius: 0.5em;
  background: var(--color-white);
  font-weight: 500;
  animation: bc-plate 24s linear infinite;
}
.bc__people {
  display: flex;
}
.bc__face {
  box-shadow: 0 0 0 0.15em var(--color-white);
}
.bc__face + .bc__face {
  margin-left: -0.35em;
}
.bc__swatches {
  /* The active ring sits 3px outside its swatch, so the row needs that much
     room or the first, the last and the bottom of it are clipped away. */
  padding: 3px;
  display: flex;
  gap: 0.3rem;
  justify-content: space-between;
}
.bc__swatch {
  position: relative;
  flex: 1 1 0;
  height: 0.9rem;
  border-radius: 0.25rem;
}
/* The ring is a pseudo-element so it can sit outside the swatch without
   changing its size and nudging the row. */
.bc__swatch::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 0.4rem;
  box-shadow: 0 0 0 2px var(--color-dark);
  opacity: 0;
  animation: bc-ring 24s linear infinite;
  animation-delay: inherit;
}

/* Twelve stops plus a return to the first, so the loop closes on itself. The
   colour eases from one preset to the next rather than cutting, which is what
   makes it worth watching. */
@keyframes bc-tile {
  0% {
    background-color: #3f3f46;
  }
  8.33% {
    background-color: #2563eb;
  }
  16.67% {
    background-color: #4f46e5;
  }
  25% {
    background-color: #7c3aed;
  }
  33.33% {
    background-color: #a21caf;
  }
  41.67% {
    background-color: #e11d48;
  }
  50% {
    background-color: #dc2626;
  }
  58.33% {
    background-color: #c2410c;
  }
  66.67% {
    background-color: #b45309;
  }
  75% {
    background-color: #15803d;
  }
  83.33% {
    background-color: #0f766e;
  }
  91.67% {
    background-color: #0e7490;
  }
  100% {
    background-color: #3f3f46;
  }
}

/* The same twelve, as text on the plate. */
@keyframes bc-plate {
  0% {
    color: #3f3f46;
  }
  8.33% {
    color: #2563eb;
  }
  16.67% {
    color: #4f46e5;
  }
  25% {
    color: #7c3aed;
  }
  33.33% {
    color: #a21caf;
  }
  41.67% {
    color: #e11d48;
  }
  50% {
    color: #dc2626;
  }
  58.33% {
    color: #c2410c;
  }
  66.67% {
    color: #b45309;
  }
  75% {
    color: #15803d;
  }
  83.33% {
    color: #0f766e;
  }
  91.67% {
    color: #0e7490;
  }
  100% {
    color: #3f3f46;
  }
}

@keyframes bc-ring {
  0%,
  8.33% {
    opacity: 1;
  }
  8.34%,
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bc__tile,
  .bc__name,
  .bc__swatch::after {
    animation: none;
  }
  .bc__tile {
    background-color: #2563eb;
  }
  .bc__name {
    color: #2563eb;
  }
}
</style>
