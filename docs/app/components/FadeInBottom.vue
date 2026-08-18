<template>
    <div ref="animatedItem">
        <div class="fadeInBottom">
            <slot />
        </div>
    </div>
</template>
<script setup lang="ts">
import { animate, inView } from "motion-v";
const animatedItem = ref(null);

onMounted(() => {
    inView(animatedItem.value, () => {
        animate(
            animatedItem.value.children[0],
            { y: 0, opacity: 1 },
            { duration: 0.7, ease: "easeOut" },
        );
    });
});
</script>
