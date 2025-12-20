<template>
    <div class="space-y-1">
        <div class="flex items-center gap-x-3" v-for="item in props.values">
            <input
                v-model="model"
                :id="props.name + '_' + item"
                type="radio"
                :name="props.name"
                :checked="item === model"
                :value="item"
                class="relative size-4 appearance-none rounded-full border border-gray bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-secondary checked:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden"
            />
            <label
                :for="props.name + '_' + item"
                class="block text-sm/6 font-medium text-gray"
                >{{ capitalizeFirstLetter(item) }}</label
            >
        </div>
    </div>
</template>
<script setup lang="ts">
const model = defineModel();

const props = defineProps({
    values: Array,
    name: String,
    selected: String,
});

function capitalizeFirstLetter(str: string): string {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}
</script>
