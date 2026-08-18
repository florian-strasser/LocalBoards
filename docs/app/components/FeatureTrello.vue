<template>
  <div class="ui trl" aria-hidden="true">
    <!-- The import dialog, and what actually comes across with the board. -->
    <p class="trl__head">Import from Trello</p>
    <span class="ui-input trl__input">trello.com/b/aBc12XyZ/roadmap</span>
    <span class="ui-button"><Download :stroke-width="2" />Import board</span>

    <ul class="trl__brings">
      <li v-for="item in brings" :key="item" class="trl__item">
        <Check :stroke-width="3" />{{ item }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Check, Download } from "lucide-vue-next";

const brings = [
  "Lists and cards",
  "Descriptions and checklists",
  "Comments and attachments",
  "What was already done",
];
</script>

<style scoped>
.trl {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.6em;
  /* A white panel filling the tile, the way the dark-mode fragment is one: this
     is a dialog in the app, and a dialog has a surface. The padding is the
     panel's own, not the frame around the graphic that used to be here. */
  /* Even gutters all round. The vertical gap is not just this padding — the
     content is centred, so it gets the leftover height as well — which is why
     the sides need the larger figure to match what the top and bottom
     actually measure. */
  padding: 1.1em 2em;
  border-radius: 0.9rem;
  background: var(--color-white);
}
.trl__head {
  color: var(--color-dark);
  font-weight: 700;
}
.trl__input {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trl__brings {
  display: flex;
  flex-direction: column;
  gap: 0.35em;
  margin-top: 0.2em;
}
.trl__item {
  display: flex;
  align-items: center;
  gap: 0.4em;
  color: var(--color-gray);
  font-size: 0.9em;
}
.trl__item svg {
  width: 1em;
  height: 1em;
  flex: none;
  color: var(--color-primary);
}
</style>
