<template>
  <!-- The flag, filling the tile. The proportions are the real ones: the circle
       of stars is two thirds of the flag's height across, and each star is a
       ninth of it — which is why the SVG is sized from its height and the ring
       is drawn from the same number. -->
  <div class="eu" aria-hidden="true">
    <svg class="eu__stars" viewBox="0 0 100 100">
      <g class="eu__ring">
        <!-- Placed by rotating out to the circle and then straightening up
             again, which is how the twelve stars stand upright on the flag
             rather than fanning outwards. -->
        <g
          v-for="i in 12"
          :key="i"
          :transform="`translate(50 50) rotate(${(i - 1) * 30}) translate(0 -33.3) rotate(${-(i - 1) * 30})`"
        >
          <path
            class="eu__star"
            :style="{ animationDelay: `${(-(i - 1) * 6) / 12}s` }"
            :d="star"
          />
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
// One five-pointed star, centred on the origin so the placement transform above
// is the only thing deciding where it goes.
const star =
  "M0,-5.55 L1.28,-1.76 L5.28,-1.72 L2.07,0.67 L3.26,4.49 L0,2.18 L-3.26,4.49 L-2.07,0.67 L-5.28,-1.72 L-1.28,-1.76 Z";
</script>

<style scoped>
.eu {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 0.9rem;
  background: #003399;
  overflow: hidden;
}
.eu__stars {
  /* Square, sized from the height — so the circle keeps its proportion of the
     flag whatever width the tile ends up at. */
  height: 60%;
  width: auto;
}
/* A full turn takes a minute — slow enough that it reads as the circle of
   stars rather than as a spinning thing, but never quite still. */
.eu__ring {
  transform-origin: 50px 50px;
  animation: eu-spin 60s linear infinite;
}
.eu__star {
  fill: #ffcc00;
  transform-box: fill-box;
  transform-origin: center;
  /* Each star a twelfth of the cycle behind the one before it, so the pulse
     travels round the ring instead of the whole circle blinking at once. */
  animation: eu-pulse 6s ease-in-out infinite;
}

@keyframes eu-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes eu-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.78;
  }
  18% {
    transform: scale(1.2);
    opacity: 1;
  }
  40% {
    transform: scale(1);
    opacity: 0.78;
  }
}

@media (prefers-reduced-motion: reduce) {
  .eu__ring,
  .eu__star {
    animation: none;
  }
  .eu__star {
    opacity: 1;
  }
}
</style>
