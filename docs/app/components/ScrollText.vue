<template>
    <div
        ref="textWrapper"
        class="relative font-light text-2xl md:text-3xl lg:text-4xl xl:text-5xl"
    >
        <div class="text-gray/80 space-y-5 pb-5" v-html="props.text" />
        <div
            ref="textAnim"
            class="absolute top-0 left-0 w-full pointer-events-none scroll-text text-black space-y-5 pb-5"
            v-html="props.text"
            aria-hidden="true"
        />
    </div>
</template>
<script setup lang="ts">
import { animate, scroll, inView } from "motion-v";
const props = defineProps({
    text: String,
});

const textAnim = ref(null);
const textWrapper = ref(null);

onMounted(() => {
    inView(textWrapper.value, () => {
        const animation = animate(
            textAnim.value,
            {
                clipPath: [
                    "polygon(0 0%, 100% 0%, 100% 0%, 0% 0%)",
                    "polygon(0 0%, 100% 0%, 100% 100%, 0% 100%)",
                ],
            },
            { ease: "easeIn" },
        );
        scroll(animation, {
            target: textWrapper.value,
            axis: "y",
            offset: ["center end", "center start"],
        });
    });
});
</script>
