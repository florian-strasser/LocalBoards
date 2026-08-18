<template>
  <div class="cta-tiles" aria-hidden="true">
    <!-- The stage the path is drawn on. It is always 16:9 and always large
         enough to cover the section, so the composition only ever scales — it
         never restretches to whatever proportion the section happens to be.
         That is what makes one set of percentages correct on a desktop and on
         a phone alike. -->
    <div class="cta-tiles__stage">
    <!--
      Seven tiles, written out one by one. Every one of them is identical: the
      same start point, the same end point, the same path, the same size and the
      same duration. The only thing that differs is where in the cycle each one
      starts, and those offsets are a fixed seventh apart.

      That is what makes it a loop rather than a drift — the tile leaving the
      frame and the one entering it stay in the same relationship for ever, so
      the spacing never bunches and there is no seam to catch however long you
      watch. The timing is linear for the same reason: any easing would run one
      stretch of the path faster than the rest and crowd the tiles there.

      Plain CSS keyframes, so transform, opacity and filter stay off the main
      thread entirely.
    -->
    <LogoTile class="cta-tiles__tile cta-tiles__tile--1" />
    <LogoTile class="cta-tiles__tile cta-tiles__tile--2" />
    <LogoTile class="cta-tiles__tile cta-tiles__tile--3" />
    <LogoTile class="cta-tiles__tile cta-tiles__tile--4" />
    <LogoTile class="cta-tiles__tile cta-tiles__tile--5" />
    <LogoTile class="cta-tiles__tile cta-tiles__tile--6" />
    <LogoTile class="cta-tiles__tile cta-tiles__tile--7" />
    </div>
  </div>
</template>

<style scoped>
/* `clip` rather than `hidden`: it contains the tiles without making this a
   scroll container, so nothing here can add a scrollbar or catch a scroll.

   Clipping cannot cut the animation short, because neither end of the path is
   ever meant to be seen: a tile begins entirely off the left edge and ends
   scaled to nothing and turned white. The edge of the section is where tiles
   arrive from and depart to — that *is* the effect. What would break the
   composition is not the clip but a stage that changes shape, which is what
   the element below is for. */
.cta-tiles {
  position: absolute;
  inset: 0;
  overflow: clip;
  pointer-events: none;
  container-type: size;

  /* One stacking context for the whole field, sitting below the copy.
     Without `isolation`, the seven tiles' own z-indexes (1 to 7) are loose in
     the section's stacking context alongside the text's `z-10` — ten beats
     seven on paper, but every tile is a composited layer of its own here
     (`will-change` plus an animated `filter`), and a browser sorting those
     layers against text that is not composited is where the flicker over the
     button came from. Isolated, the seven sort among themselves and the field
     as a whole is one layer at `z-index: 0` — there is no ordering left to get
     wrong. */
  z-index: 0;
  isolation: isolate;

  /* A quarter of the section's width, and never less. The seven tiles are
     spaced a seventh of the path apart — 19.3% of the width — so at 25% they
     overlap by about a quarter of a tile, and it is that overlap which makes
     the field read as the logo's two stacked cards rather than as a row of
     separate squares. Capping the width by the section's height, which is what
     kept them inside a short section before, took them to 13% and the overlap
     went with it. */
  --tile-w: 25cqw;
  /* The tile is 1812:1203, and it is rotated 6°, so its lowest corner sits this
     far below its own top edge: half the height, plus half the height of the
     rotated bounding box. Starting the path that far up from the bottom is what
     keeps a full-size tile inside the section instead of shrinking it to fit. */
  --tile-reach: calc(var(--tile-w) * 0.72);
}

/* The stage is the visible section, exactly. A stage larger than the section —
   16:9 sized to cover — was the wrong idea: the path's start point then lands
   below the visible area, and a tile there is at full size and full colour, so
   the bottom edge sliced a solid rectangle in half in the middle of the
   picture. The endpoints have to sit on the edges the viewer can see. */
.cta-tiles__stage {
  position: absolute;
  inset: 0;
}
.cta-tiles__tile {
  position: absolute;
  /* Positioned at the top-left corner; the travel below places it. */
  left: 0;
  top: 0;
  width: var(--tile-w);
  height: auto;
  will-change: transform, color, filter;
  animation: cta-tile-drift 21s linear infinite;
}

/* Painted youngest on top. Each tile stays the same distance ahead of the next
   for ever, so tile 1 is always the one that has just entered and tile 7 always
   the one about to leave — which makes a fixed order the right order: the
   large, blue, near tile passes in front of the small, pale, far one. */
.cta-tiles__tile--1 {
  z-index: 7;
}
.cta-tiles__tile--2 {
  z-index: 6;
}
.cta-tiles__tile--3 {
  z-index: 5;
}
.cta-tiles__tile--4 {
  z-index: 4;
}
.cta-tiles__tile--5 {
  z-index: 3;
}
.cta-tiles__tile--6 {
  z-index: 2;
}
.cta-tiles__tile--7 {
  z-index: 1;
}

/* A seventh of the cycle between each, and negative — so the section opens
   with all seven already spread along the path rather than on an empty stage
   that fills up over the first twenty seconds. */
.cta-tiles__tile--1 {
  animation-delay: 0s;
}
.cta-tiles__tile--2 {
  animation-delay: -3s;
}
.cta-tiles__tile--3 {
  animation-delay: -6s;
}
.cta-tiles__tile--4 {
  animation-delay: -9s;
}
.cta-tiles__tile--5 {
  animation-delay: -12s;
}
.cta-tiles__tile--6 {
  animation-delay: -15s;
}
.cta-tiles__tile--7 {
  animation-delay: -18s;
}

/* Bottom left to top right: shrinking away to nothing, turning from -6° to +4°,
   blurring to 16px, and losing its colour to white rather than its opacity.

   That last part is the difference between this reading as depth and reading as
   cellophane: a tile that fades is transparent for most of its life, so every
   overlap shows both tiles through each other. Going to white instead keeps
   every tile solid — one simply passes in front of another — and since the page
   behind them is white too, a tile that has arrived is just as gone.

   The travel is in container units — a share of the section's own width and
   height rather than of the tile — so both ends of the path land on edges the
   viewer can see, whatever shape the section is. It starts 30% of the width to
   the left of the left edge, so a tile is entirely outside before it enters,
   and finishes past the right edge at the very top, by which point it has
   scaled to nothing. Percentages of the *tile* were what tied the vertical
   travel to the section's width: the path then spanned 73% of the height on a
   desktop and 19% on a phone, the same animation drawn at two different
   angles. */
@keyframes cta-tile-drift {
  0% {
    transform: translate3d(-30cqw, calc(100cqh - var(--tile-reach)), 0)
      rotate(-6deg) scale(1);
    color: color-mix(in oklab, var(--color-primary) 16%, white);
    filter: blur(0px);
  }
  100% {
    transform: translate3d(105cqw, 0, 0) rotate(4deg) scale(0);
    color: #ffffff;
    filter: blur(16px);
  }
}

/* A background that never stops moving is exactly what this preference is for. */
@media (prefers-reduced-motion: reduce) {
  .cta-tiles__tile {
    animation: none;
    transform: translate3d(30cqw, calc(50cqh - var(--tile-reach) * 0.7), 0)
      rotate(-6deg) scale(0.7);
    color: color-mix(in oklab, var(--color-primary) 16%, white);
  }
}
</style>
