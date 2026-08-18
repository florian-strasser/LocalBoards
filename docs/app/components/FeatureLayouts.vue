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
