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
