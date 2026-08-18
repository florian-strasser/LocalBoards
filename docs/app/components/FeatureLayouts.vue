<template>
  <div class="ui lay" aria-hidden="true">
    <!-- The board's layout option, switching. The control is the app's
         segmented control; below it the very same areas and the very same cards
         rearrange themselves — side by side as columns, stacked full width as a
         list. Showing different content in the two views would suggest the
         layout changes what is on the board, and it does not. -->
    <div class="lay__control">
      <span class="lay__thumb" />
      <span class="lay__option">Kanban</span>
      <span class="lay__option">To-do</span>
    </div>

    <div class="lay__stage">
      <div class="lay__view lay__view--kanban">
        <div v-for="area in areas" :key="area.name" class="ui-area lay__col">
          <p class="ui-area__head">{{ area.name }}</p>
          <div v-for="card in area.cards" :key="card" class="ui-card">
            <div class="ui-card__row">
              <span class="ui-status" />
              <span class="ui-card__title">{{ card }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="lay__view lay__view--todo">
        <div v-for="area in areas" :key="area.name" class="ui-area">
          <p class="ui-area__head">{{ area.name }}</p>
          <div v-for="card in area.cards" :key="card" class="ui-card">
            <div class="ui-card__row">
              <span class="ui-status" />
              <span class="ui-card__title">{{ card }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// One set of areas, drawn twice.
const areas = [
  {
    name: "Backlog",
    cards: [
      "Competitor research",
      "Redesign the logo",
      "Draft the pricing page",
      "Write the launch announcement",
    ],
  },
  {
    name: "In Progress",
    cards: [
      "Build the public API",
      "New onboarding flow",
      "Rework the settings",
      "Write the API docs",
    ],
  },
];
</script>

<style scoped>
.lay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.7rem;
}
.lay__control {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-self: center;
  padding: 0.2em;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-dark) 8%, transparent);
}
.lay__option {
  position: relative;
  z-index: 1;
  padding: 0.3em 1em;
  text-align: center;
  color: var(--color-dark);
  font-weight: 500;
}
.lay__thumb {
  position: absolute;
  z-index: 0;
  top: 0.2em;
  bottom: 0.2em;
  left: 0.2em;
  width: calc(50% - 0.2em);
  border-radius: 999px;
  background: var(--color-white);
  box-shadow: 0 1px 3px color-mix(in oklab, var(--color-dark) 15%, transparent);
  animation: lay-thumb 9s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.lay__stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}
.lay__view {
  position: absolute;
  inset: 0;
  /* Both views hold more than the stage can show, which is the honest shape of
     a board. The bottom fades out rather than being cut off square. */
  mask-image: linear-gradient(to bottom, #000 78%, transparent 99%);
}
.lay__view--kanban {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
  gap: 0.5rem;
  animation: lay-kanban 9s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
/* Stacked full width, the same areas one after another — and much taller than
   the stage, so it fades out sooner. */
.lay__view--todo {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  mask-image: linear-gradient(to bottom, #000 62%, transparent 96%);
  animation: lay-todo 9s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.lay__col {
  min-width: 0;
}

/* The thumb and the two views are on one clock, so the layout underneath has
   always already changed by the time the control finishes moving. */
@keyframes lay-thumb {
  0%,
  40% {
    transform: translateX(0);
  }
  50%,
  90% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(0);
  }
}
@keyframes lay-kanban {
  0%,
  38% {
    opacity: 1;
    transform: translateY(0);
  }
  48%,
  92% {
    opacity: 0;
    transform: translateY(-0.4rem);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes lay-todo {
  0%,
  38% {
    opacity: 0;
    transform: translateY(0.4rem);
  }
  48%,
  92% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(0.4rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lay__thumb,
  .lay__view {
    animation: none;
  }
  .lay__view--todo {
    opacity: 0;
  }
}
</style>
