<template>
    <FadeInBottom class="pt-4 lg:pt-5">
        <div class="bg-slate rounded-2xl">
            <button
                class="faq-frage cursor-pointer transition-color duration-300 text-left w-full flex justify-between items-center py-6 rounded-2xl"
                :aria-controls="'accordion-content-' + (props.index + 1)"
                :aria-expanded="open"
                :id="'accordion-control-' + (props.index + 1)"
                :class="{
                    'text-primary': open,
                    'text-gray hover:text-primary': !open,
                }"
                @click="toggleOpen"
            >
                <h3>{{ props.frage }}</h3>
                <div class="active-bars">
                    <div
                        class="bar top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    />
                    <div
                        class="bar top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-300"
                        :class="{ 'rotate-90': !open }"
                    />
                </div>
            </button>
            <div
                ref="ele"
                :id="'accordion-content-' + (props.index + 1)"
                :aria-hidden="!open"
                class="faq-antwort text-gray h-0 overflow-clip"
            >
                <div
                    class="faq-inner-antwort w-full space-y-3 lg:space-y-4"
                    v-html="props.antwort"
                />
            </div>
        </div>
    </FadeInBottom>
</template>
<script setup lang="ts">
import { animate } from "motion-v";
const props = defineProps({
    frage: String,
    antwort: String,
    index: Number,
});
const ele = ref(null);
const open = ref(false);

const toggleOpen = () => {
    if (open.value) {
        animate(ele.value, { height: 0 }, { ease: "linear" });
        open.value = false;
    } else {
        animate(ele.value, { height: "auto" }, { ease: "linear" });
        open.value = true;
    }
};
</script>
