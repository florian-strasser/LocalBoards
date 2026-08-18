<template>
  <div class="ui chk" aria-hidden="true">
    <!-- Checklists are not a separate feature in the app — they are ordinary
         Markdown in the card description, counted automatically. So this is the
         list being ticked off, with the card's own meta count keeping up: 1/6,
         2/6, 3/6, exactly as the card tile writes it. -->
    <div class="ui-card chk__card">
      <div class="ui-card__row">
        <span class="ui-status" />
        <span class="ui-card__title">Redesign the logo</span>
      </div>
      <div class="ui-meta">
        <span class="ui-meta__item">
          <ListChecks :stroke-width="2" />
          <!-- Stacked rather than swapped, so the row never changes width as
               the number does. -->
          <span class="chk__count">
            <span
              v-for="n in items.length + 1"
              :key="n"
              class="chk__count-value"
              :class="`chk__count-value--${n - 1}`"
              >{{ n - 1 }}/{{ items.length }}</span
            >
            <span class="chk__count-space">0/{{ items.length }}</span>
          </span>
        </span>
        <span class="ui-meta__item">
          <MessageSquareText :stroke-width="2" />3
        </span>
      </div>
    </div>

    <ul class="chk__list">
      <li v-for="(item, index) in items" :key="item" class="chk__item">
        <span class="chk__box" :class="`chk__box--${index + 1}`">
          <Check :stroke-width="3.5" />
        </span>
        <span>{{ item }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Check, ListChecks, MessageSquareText } from "lucide-vue-next";

// The checklist out of the card's description. Six of them: enough to fill the
// tile, and enough that the count visibly climbs rather than jumping.
const items = [
  "Collect references",
  "First round of concepts",
  "Team review",
  "Pick the final mark",
  "Export the assets",
  "Update the brand page",
];
</script>

<style scoped>
.chk {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.8rem;
}
.chk__card {
  background: var(--color-white);
}
.chk__count {
  position: relative;
  display: inline-grid;
}
.chk__count-value {
  grid-area: 1 / 1;
  /* Longhands, not the shorthand: `animation: 12s linear infinite` with the
     name left for the modifier rule to supply parses as a nameless animation,
     and the modifier then sets a name onto a zero duration. */
  animation-duration: 12s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
/* An invisible copy of the value reserves the room, so the stacked ones have
   something to size the grid cell to. */
.chk__count-space {
  grid-area: 1 / 1;
  visibility: hidden;
}

.chk__count-value--0 {
  animation-name: chk-count-0;
}
.chk__count-value--1 {
  animation-name: chk-count-1;
}
.chk__count-value--2 {
  animation-name: chk-count-2;
}
.chk__count-value--3 {
  animation-name: chk-count-3;
}
.chk__count-value--4 {
  animation-name: chk-count-4;
}
.chk__count-value--5 {
  animation-name: chk-count-5;
}
.chk__count-value--6 {
  animation-name: chk-count-6;
}

.chk__list {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  padding-left: 0.2em;
  color: var(--color-dark);
}
.chk__item {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
/* Square with a rounded corner, as the Markdown checkbox renders in the app —
   not the circle the card status uses. */
.chk__box {
  display: grid;
  place-items: center;
  flex: none;
  width: 1.25em;
  height: 1.25em;
  border-radius: 0.3em;
  border: 0.15em solid var(--color-gray);
  /* `color` is what the tick inherits, so animating it here is what makes the
     mark appear and disappear with the box rather than separately. */
  color: transparent;
  background: transparent;
}
.chk__box svg {
  width: 0.8em;
  height: 0.8em;
}

/* One keyframe set per item rather than a shared one with staggered delays:
   the ticks come in one at a time, but they all have to clear together at the
   end of the loop, and a delay would carry the reset along with it. */

.chk__box--1 {
  animation: chk-1 12s linear infinite;
}
.chk__box--2 {
  animation: chk-2 12s linear infinite;
}
.chk__box--3 {
  animation: chk-3 12s linear infinite;
}
.chk__box--4 {
  animation: chk-4 12s linear infinite;
}
.chk__box--5 {
  animation: chk-5 12s linear infinite;
}
.chk__box--6 {
  animation: chk-6 12s linear infinite;
}

@keyframes chk-1 {
  0%,
  4% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
  6%,
  84% {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-white);
  }
  86%,
  100% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
}
@keyframes chk-2 {
  0%,
  13% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
  15%,
  84% {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-white);
  }
  86%,
  100% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
}
@keyframes chk-3 {
  0%,
  22% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
  24%,
  84% {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-white);
  }
  86%,
  100% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
}
@keyframes chk-4 {
  0%,
  30% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
  32%,
  84% {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-white);
  }
  86%,
  100% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
}
@keyframes chk-5 {
  0%,
  39% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
  41%,
  84% {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-white);
  }
  86%,
  100% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
}
@keyframes chk-6 {
  0%,
  48% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
  50%,
  84% {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-white);
  }
  86%,
  100% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
  }
}

/* Each value is on screen for exactly the stretch its own count is true. */
@keyframes chk-count-0 {
  0%,
  5% {
    opacity: 1;
  }
  6%,
  85% {
    opacity: 0;
  }
  86%,
  100% {
    opacity: 1;
  }
}
@keyframes chk-count-1 {
  0%,
  5% {
    opacity: 0;
  }
  6%,
  14% {
    opacity: 1;
  }
  15%,
  100% {
    opacity: 0;
  }
}
@keyframes chk-count-2 {
  0%,
  14% {
    opacity: 0;
  }
  15%,
  23% {
    opacity: 1;
  }
  24%,
  100% {
    opacity: 0;
  }
}
@keyframes chk-count-3 {
  0%,
  23% {
    opacity: 0;
  }
  24%,
  31% {
    opacity: 1;
  }
  32%,
  100% {
    opacity: 0;
  }
}
@keyframes chk-count-4 {
  0%,
  31% {
    opacity: 0;
  }
  32%,
  40% {
    opacity: 1;
  }
  41%,
  100% {
    opacity: 0;
  }
}
@keyframes chk-count-5 {
  0%,
  40% {
    opacity: 0;
  }
  41%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}
@keyframes chk-count-6 {
  0%,
  49% {
    opacity: 0;
  }
  50%,
  85% {
    opacity: 1;
  }
  86%,
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chk__box,
  .chk__count-value {
    animation: none;
  }
  .chk__count-value:not(.chk__count-value--0) {
    opacity: 0;
  }
}
</style>
