<template>
  <div class="ui inv" aria-hidden="true">
    <!-- The invite dialog, standing still. -->
    <p class="inv__head">Invite to Product Roadmap</p>

    <div class="inv__row">
      <span class="ui-input inv__input">alex@example.com</span>
      <span class="ui-button"><Send :stroke-width="2" />Invite</span>
    </div>

    <ul class="inv__people">
      <li v-for="person in people" :key="person.name" class="inv__person">
        <span class="ui-avatar">{{ person.initials }}</span>
        <span class="inv__name">{{ person.name }}</span>
        <span class="inv__role">{{ person.role }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Send } from "lucide-vue-next";

const people = [
  { name: "Ben Schmidt", initials: "BS", role: "Owner" },
  { name: "Alex Morgan", initials: "AM", role: "Member" },
  { name: "Carol Nguyen", initials: "CN", role: "Member" },
  { name: "Jordan Rivera", initials: "JR", role: "Member" },
  { name: "Tom Fischer", initials: "TF", role: "Read only" },
];
</script>

<style scoped>
.inv {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.7em;
  /* A white panel filling the tile: this is a dialog in the app, and a dialog
     has a surface.

     Even gutters all round. The vertical gap works out at half the height the
     content leaves over, whatever the padding here is set to, so the sides are
     the only figure worth tuning — 1.7em is the 19px this tile's content
     leaves. The Trello panel holds one row less and so wants 2em. */
  padding: 1.1em 1.7em;
  border-radius: 0.9rem;
  background: var(--color-white);
}
.inv__head {
  color: var(--color-dark);
  font-weight: 700;
}
.inv__row {
  display: flex;
  gap: 0.4em;
}
.inv__input {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inv__people {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  margin-top: 0.2em;
}
.inv__person {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.inv__name {
  color: var(--color-dark);
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inv__role {
  margin-left: auto;
  flex: none;
  padding: 0.15em 0.5em;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-dark) 8%, transparent);
  color: var(--color-gray);
  font-size: 0.85em;
}
</style>
