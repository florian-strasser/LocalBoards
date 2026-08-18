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
