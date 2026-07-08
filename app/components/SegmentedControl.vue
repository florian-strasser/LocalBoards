<template>
    <!-- Segmented toggle: styled radio group where the active option is a filled
         pill. Same props as RadioList, so it's a drop-in for small option sets. -->
    <div
        class="flex w-full gap-1 rounded-lg bg-dark/10 p-1 dark:bg-white/10"
    >
        <label
            v-for="item in props.values"
            :key="item.value"
            class="min-w-0 flex-1 cursor-pointer"
        >
            <input
                v-model="model"
                type="radio"
                :name="props.name"
                :value="item.value"
                class="peer sr-only"
            />
            <span
                class="block select-none truncate rounded-md px-4 py-1.5 text-center text-sm font-medium text-gray transition-colors peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
            >
                {{ capitalizeFirstLetter(item.label) }}
            </span>
        </label>
    </div>
</template>
<script setup lang="ts">
const model = defineModel();

const props = defineProps({
    values: Array as () => { value: string; label: string }[],
    name: String,
});

function capitalizeFirstLetter(str: string): string {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}
</script>
