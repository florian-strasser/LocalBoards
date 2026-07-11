<template>
    <div class="space-y-1">
        <label class="flex items-center gap-x-3" v-for="item in props.values">
            <input
                v-model="model"
                :id="props.name + '_' + item"
                type="radio"
                :name="props.name"
                :checked="item.value === model"
                :value="item.value"
                class="radio-check"
            />
            <div class="block text-sm/6 font-medium text-gray">
                {{ capitalizeFirstLetter(item.label) }}
            </div>
        </label>
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
