<template>
  <div class="ui rt" aria-hidden="true">
    <!-- Three areas out of a real board, drawn the way the app draws them:
         white panels on the grey surface, grey cards inside. One card is
         dragged Backlog → In Progress, ticked off where it is being worked on,
         then filed in Done — and the areas open and close a slot for it exactly
         as they do when you drag a card in LokalBoards, so the card is really
         put down rather than floated over the top.

         The two drags are made by two different people: the blue cursor hands
         the card over, the green one finishes it. -->
    <div
      v-for="(area, index) in areas"
      :key="area.name"
      class="ui-area rt__area"
    >
      <p class="ui-area__head">
        {{ area.name }}
        <Trash2 :stroke-width="1.75" />
      </p>

      <div v-for="card in area.cards" :key="card.title" class="ui-card">
        <div class="ui-card__row">
          <span class="ui-status" :class="{ 'ui-status--done': card.done }">
            <Check :stroke-width="3" />
          </span>
          <span class="ui-card__title">{{ card.title }}</span>
        </div>
        <div v-if="card.checklist || card.comments || card.due" class="ui-meta">
          <span v-if="card.checklist" class="ui-meta__item">
            <ListChecks :stroke-width="2" />{{ card.checklist }}
          </span>
          <span v-if="card.comments" class="ui-meta__item">
            <MessageSquareText :stroke-width="2" />{{ card.comments }}
          </span>
          <span v-if="card.due" class="ui-meta__item">
            <Clock :stroke-width="2" />{{ card.due
            }}<span v-if="card.time" class="rt__time">, {{ card.time }}</span>
          </span>
        </div>
      </div>

      <!-- The slot each area opens to hold the card. All three are in the same
           place, because each area's two cards come to the same height — one
           with a meta row, one without. That is what lets the card cross with a
           plain `translateX` and still land square in the gap the next area has
           opened for it. -->
      <div class="rt__slot" :class="`rt__slot--${index + 1}`">
        <div v-if="area.first" class="rt__mover">
          <div class="ui-card rt__card--live">
            <div class="ui-card__row">
              <span class="ui-status rt__status">
                <Check :stroke-width="3" />
              </span>
              <span class="ui-card__title">Draft the pricing page</span>
              <span class="ui-avatar rt__avatar">BS</span>
            </div>
            <div class="ui-meta">
              <span class="ui-meta__item">
                <Clock :stroke-width="2" />Aug 14<span class="rt__time"
                  >, 10:41 PM</span
                >
              </span>
            </div>
          </div>

          <!-- One cursor per hand-over. Both sit at the corner of the card and
               are only on screen while their own drag is happening. -->
          <svg class="rt__cursor rt__cursor--blue" viewBox="0 0 24 24">
            <path :d="pointer" />
          </svg>
          <svg class="rt__cursor rt__cursor--green" viewBox="0 0 24 24">
            <path :d="pointer" />
          </svg>
        </div>
      </div>

      <span class="ui-button rt__new">
        <Plus :stroke-width="2.5" />Create card
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Check,
  Clock,
  ListChecks,
  MessageSquareText,
  Plus,
  Trash2,
} from "lucide-vue-next";

// The board from the demo screenshots, so the site and the screenshots on it
// are showing the same thing.
//
// Backlog and In Progress carry the same three cards' worth of height — two
// without a meta row and one with — so their slots line up exactly and the card
// crosses between them on a flat line. Done is one card shorter, which the
// travel keyframes make up with `--done-lift`.
const areas = [
  {
    name: "Backlog",
    first: true,
    cards: [
      { title: "Competitor research" },
      { title: "Redesign the logo", checklist: "1/3", comments: "3" },
      { title: "Write the launch announcement" },
    ],
  },
  {
    name: "In Progress",
    cards: [
      { title: "Build the public API", due: "Aug 8", time: "10:41 PM" },
      { title: "New onboarding flow" },
      { title: "Rework the settings screen" },
    ],
  },
  {
    name: "Done",
    cards: [
      { title: "Set up CI/CD", done: true },
      { title: "Launch the landing page", done: true, comments: "2" },
    ],
  },
];

const pointer =
  "M4 2 L4 18 L8.4 14.1 L11.4 20.5 L14.4 19 L11.4 12.9 L17 12.4 Z";
</script>

<style scoped>
/* Below `xs` the columns are narrower than "Aug 14, 10:41 PM" can be set in, so
   the clock time goes and the date stays — the date alone fits, and it is the
   half that says something in a picture about work moving between areas. The
   30rem matches the breakpoint of the same name in main.css. */
@media (width < 30rem) {
  .rt__time {
    display: none;
  }
}

.rt {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: start;
  align-content: start;
  gap: 0.625rem;
  /* How far an area opens to take the card: the card's own height, measured
     from the built page at 41px against this fragment's 11.2px em. */
  --slot: 3.7em;
  /* Done holds one card fewer than the other two, so its slot sits that much
     higher: a card without a meta row (0.5em padding, a 1.3em row, 0.5em
     padding) plus the gap above it. */
  --done-lift: -2.8em;
}
.rt__area {
  min-width: 0;
}
.rt__slot {
  position: relative;
  height: 0;
}
.rt__slot--1 {
  animation: rt-slot-1 15s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.rt__slot--2 {
  animation: rt-slot-2 15s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.rt__slot--3 {
  animation: rt-slot-3 15s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}

/* The card is anchored to the slot of the area it starts in, so its resting
   position follows that area's stack of cards rather than a number written down
   here.

   One area over is the slot's own width plus the two area paddings it crosses
   plus the grid gap — `100%` alone lands it short by the padding, which is
   exactly the amount it was sitting off by. */
.rt__mover {
  position: absolute;
  inset: 0 0 auto 0;
  /* Above the areas it crosses — without this the later ones, being later in
     the document, would paint over it mid-journey. */
  z-index: 2;
  animation: rt-travel 15s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.rt__card--live {
  background: var(--color-white);
  box-shadow:
    0 10px 24px -8px color-mix(in oklab, var(--color-dark) 35%, transparent),
    0 0 0 1px color-mix(in oklab, var(--color-dark) 6%, transparent);
  animation: rt-lift 15s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.rt__status {
  animation: rt-tick 15s linear infinite;
}
.rt__avatar {
  margin-left: auto;
}
.rt__cursor {
  position: absolute;
  right: -0.5em;
  bottom: -0.9em;
  width: 1.5em;
  height: 1.5em;
  opacity: 0;
  /* A white edge, so the pointer stays legible over the card and over the
     board alike. */
  stroke: var(--color-white);
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.rt__cursor--blue {
  fill: var(--color-primary);
  animation: rt-cursor-blue 15s ease-out infinite;
}
.rt__cursor--green {
  /* One of the board presets rather than a new colour: it only has to read as
     "somebody else", and it already clears contrast against white. */
  fill: #15803d;
  animation: rt-cursor-green 15s ease-out infinite;
}

/* One pass of the loop, in the order the work actually happens: dragged out of
   Backlog and dropped in In Progress, ticked off a beat later where it is being
   worked on, and only then filed in Done. Ticking it on arrival in Done would
   have the board saying the work finished because it was filed, which is
   backwards.

   It fades out at the end and back in at Backlog rather than sliding home — a
   card travelling backwards through the areas is not something a board does. */
@keyframes rt-travel {
  0% {
    transform: translateX(0);
    opacity: 0;
  }
  6%,
  18% {
    transform: translateX(0);
    opacity: 1;
  }
  30%,
  56% {
    transform: translateX(calc(100% + 1.4em + 0.625rem));
    opacity: 1;
  }
  66%,
  88% {
    transform: translate(
      calc(200% + 2.8em + 1.25rem),
      var(--done-lift)
    );
    opacity: 1;
  }
  96%,
  100% {
    transform: translate(
      calc(200% + 2.8em + 1.25rem),
      var(--done-lift)
    );
    opacity: 0;
  }
}

/* Picked up as it leaves, set down as it arrives — once for each of the two
   moves, and flat for the whole stretch in between where it is only being
   worked on. */
@keyframes rt-lift {
  0%,
  18% {
    transform: scale(1) rotate(0deg);
  }
  24% {
    transform: scale(1.05) rotate(-1.5deg);
  }
  30%,
  56% {
    transform: scale(1) rotate(0deg);
  }
  61% {
    transform: scale(1.05) rotate(-1.5deg);
  }
  66%,
  100% {
    transform: scale(1) rotate(0deg);
  }
}

/* Ticked while the card is sitting in In Progress, a beat after it lands. The
   `color` is what the check mark inherits, so animating it here is what brings
   the mark in with the circle rather than separately; the small overshoot is
   the click. It clears again at 96%, by which point the card has faded out and
   nobody sees it reset. */
@keyframes rt-tick {
  0%,
  40% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
    transform: scale(1);
  }
  43% {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-white);
    transform: scale(1.25);
  }
  46%,
  92% {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-white);
    transform: scale(1);
  }
  96%,
  100% {
    border-color: var(--color-gray);
    background: transparent;
    color: transparent;
    transform: scale(1);
  }
}

/* The area the card is leaving closes as the drag begins; the one it is going
   to opens before it lands, so the card drops into a gap rather than pushing
   one open on arrival. */
@keyframes rt-slot-1 {
  0%,
  18% {
    height: var(--slot);
  }
  27%,
  90% {
    height: 0;
  }
  99%,
  100% {
    height: var(--slot);
  }
}
@keyframes rt-slot-2 {
  0%,
  21% {
    height: 0;
  }
  29%,
  56% {
    height: var(--slot);
  }
  65%,
  100% {
    height: 0;
  }
}
@keyframes rt-slot-3 {
  0%,
  59% {
    height: 0;
  }
  65%,
  90% {
    height: var(--slot);
  }
  97%,
  100% {
    height: 0;
  }
}

/* Each cursor is only on screen for its own hand-over: it arrives just before
   the card moves, rides with it, and lets go once the card is down. */
@keyframes rt-cursor-blue {
  0%,
  14% {
    opacity: 0;
    transform: translate(0.4em, 0.4em);
  }
  17%,
  31% {
    opacity: 1;
    transform: translate(0, 0);
  }
  36%,
  100% {
    opacity: 0;
    transform: translate(0.4em, 0.4em);
  }
}
@keyframes rt-cursor-green {
  0%,
  52% {
    opacity: 0;
    transform: translate(0.4em, 0.4em);
  }
  55%,
  67% {
    opacity: 1;
    transform: translate(0, 0);
  }
  72%,
  100% {
    opacity: 0;
    transform: translate(0.4em, 0.4em);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rt__mover,
  .rt__card--live,
  .rt__status,
  .rt__slot,
  .rt__cursor {
    animation: none;
  }
  .rt__slot--1 {
    height: var(--slot);
  }
}
</style>
