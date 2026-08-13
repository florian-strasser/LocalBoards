<template>
    <div class="block w-full space-y-1">
        <label class="text-sm">
            {{ props.label }}
        </label>
        <div class="flex flex-wrap items-center gap-2">
            <!-- "No colour" comes first and is the default: the tile keeps the
                 instance's primary colour, which is what every board looked
                 like before this existed. -->
            <button
                type="button"
                class="swatch"
                :class="{ 'swatch-active': !data }"
                :aria-label="$t('boardColorDefault')"
                :aria-pressed="!data"
                v-tooltip="$t('boardColorDefault')"
                @click="data = null"
            >
                <span class="swatch-face bg-primary"></span>
            </button>

            <button
                v-for="color in BOARD_COLORS"
                :key="color"
                type="button"
                class="swatch"
                :class="{ 'swatch-active': data === color }"
                :aria-label="color"
                :aria-pressed="data === color"
                @click="data = color"
            >
                <span
                    class="swatch-face"
                    :style="{ backgroundColor: color }"
                ></span>
            </button>

            <!-- The native picker, wearing the same swatch as the presets. It
                 shows the current custom colour when there is one, so the row
                 always reflects what the tile will look like. `label` rather
                 than a button: clicking a colour input is what opens the
                 platform picker, and a button wrapping it would not. -->
            <label
                class="swatch cursor-pointer"
                :class="{ 'swatch-active': isCustom }"
                v-tooltip="$t('boardColorCustom')"
            >
                <span
                    class="swatch-face flex items-center justify-center"
                    :style="
                        isCustom
                            ? { backgroundColor: data }
                            : { background: WHEEL }
                    "
                >
                    <Pipette
                        class="size-4"
                        :style="{ color: isCustom ? customIconColor : '#ffffff' }"
                    />
                </span>
                <input
                    type="color"
                    class="sr-only"
                    :value="data || '#2563eb'"
                    :aria-label="$t('boardColorCustom')"
                    @input="onCustomInput"
                />
            </label>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Pipette } from "lucide-vue-next";
import {
    BOARD_COLORS,
    boardTextColor,
    normalizeBoardColor,
} from "@/utils/boardColor";

const props = defineProps({
    label: String,
});

// null = no colour chosen (the tile uses the primary colour).
const data = defineModel<string | null>();

const WHEEL =
    "conic-gradient(#dc2626, #b45309, #15803d, #0e7490, #2563eb, #7c3aed, #a21caf, #dc2626)";

// A colour the user mixed themselves, i.e. one that isn't in the preset row.
const isCustom = computed(
    () => !!data.value && !BOARD_COLORS.includes(data.value),
);

// The pipette sits on the chosen colour once there is one, so it needs the same
// readability treatment as the tile itself.
const customIconColor = computed(() =>
    data.value ? boardTextColor(data.value) : "#ffffff",
);

const onCustomInput = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    data.value = normalizeBoardColor(value);
};
</script>

<style scoped>
.swatch {
    height: 2.25rem;
    width: 2.25rem;
    border-radius: 0.5rem;
    padding: 2px;
    /* The ring is drawn as padding around the face rather than an outline, so
       selecting a swatch doesn't change its size and the row never reflows. */
    border: 2px solid transparent;
}
/* The one selection marker that can't be the primary colour: the primary
   colour is itself one of the swatches, so a primary ring would vanish on
   exactly the swatch it needs to mark. A neutral ring in the page's own
   foreground stays visible against every colour, including the user's. */
.swatch-active {
    border-color: var(--color-dark);
}
@media (prefers-color-scheme: dark) {
    .swatch-active {
        border-color: var(--color-white);
    }
}
.swatch-face {
    display: block;
    height: 100%;
    width: 100%;
    border-radius: 0.25rem;
}
</style>
