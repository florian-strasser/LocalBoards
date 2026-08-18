<template>
  <div>
    <VueLenis
      root
      :options="{
        autoRaf: true,
        anchors: true,
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
      }"
    >
      <slot />
    </VueLenis>
  </div>
</template>
<script setup lang="ts">
import { VueLenis } from "lenis/vue";
</script>
