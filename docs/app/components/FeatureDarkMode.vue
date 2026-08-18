<template>
  <div class="ui dm" aria-hidden="true">
    <!-- One board area, lit both ways. It is the area itself that changes and
         nothing else: no wrapper behind it, because a panel that is invisible
         against the tile in one theme and a solid dark block in the other reads
         as an extra thing appearing rather than as the same thing relit.

         Everything inside is tinted from the area's own text colour, which is
         how the app gets one set of values to work in both themes. -->
    <div class="ui-area dm__area">
      <p class="ui-area__head">
        This Week
        <span class="dm__toggle">
          <svg viewBox="0 0 24 24" class="dm__icon dm__icon--sun">
            <circle cx="12" cy="12" r="4.5" fill="currentColor" />
            <g stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" />
            </g>
          </svg>
          <svg viewBox="0 0 24 24" class="dm__icon dm__icon--moon">
            <path
              d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </p>

      <div v-for="card in cards" :key="card.title" class="ui-card">
        <div class="ui-card__row">
          <span class="ui-status" :class="{ 'ui-status--done': card.done }">
            <Check :stroke-width="3" />
          </span>
          <span class="ui-card__title">{{ card.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check } from "lucide-vue-next";

const cards = [
  { title: "Buy groceries" },
  { title: "Call the dentist" },
  { title: "Book the flights" },
  { title: "Renew the domain", done: true },
  { title: "Finish the quarterly report", done: true },
];
</script>

<style scoped>
.dm {
  position: absolute;
  inset: 0;
}
.dm__area {
  height: 100%;
  animation: dm-theme 9s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.dm__toggle {
  position: relative;
  display: block;
  flex: none;
  width: 1.15em;
  height: 1.15em;
}
.dm__icon {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* The area head styles every icon in it primary; this one belongs to the
     theme rather than to an action, so it follows the text. */
  color: inherit;
}
.dm__icon--sun {
  animation: dm-sun 9s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.dm__icon--moon {
  animation: dm-moon 9s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
/* Everything inside follows the panel rather than the global tokens, so one
   change of `color` carries the whole fragment across. */
.dm__area .ui-area__head,
.dm__area .ui-card__title {
  color: inherit;
}
.dm__area .ui-card {
  background: color-mix(in oklab, currentColor 12%, transparent);
}
.dm__area .ui-status {
  border-color: color-mix(in oklab, currentColor 55%, transparent);
}
.dm__area .ui-status--done {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-white);
}

/* The app's light panel, then the app's dark one. */
@keyframes dm-theme {
  0%,
  40% {
    background: #ffffff;
    color: #1c1c1e;
  }
  50%,
  90% {
    background: #2c2c2e;
    color: #ffffff;
  }
  100% {
    background: #ffffff;
    color: #1c1c1e;
  }
}
@keyframes dm-sun {
  0%,
  40% {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
  50%,
  90% {
    opacity: 0;
    transform: rotate(-90deg) scale(0.5);
  }
  100% {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
}
@keyframes dm-moon {
  0%,
  40% {
    opacity: 0;
    transform: rotate(90deg) scale(0.5);
  }
  50%,
  90% {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(90deg) scale(0.5);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dm__area,
  .dm__icon {
    animation: none;
  }
  .dm__area {
    background: #ffffff;
    color: #1c1c1e;
  }
  .dm__icon--moon {
    opacity: 0;
  }
}
</style>
