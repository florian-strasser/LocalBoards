<template>
    <label class="block flex gap-x-2">
        <div class="group grid size-4 grid-cols-1 mt-0.5 shrink-0 grow-0">
            <input
                type="checkbox"
                :required="props.required"
                v-model="data"
                class="col-start-1 row-start-1 appearance-none rounded-sm border border-gray/33 bg-white checked:border-secondary checked:bg-secondary indeterminate:border-secondary indeterminate:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:border-gray/20 disabled:bg-gray/10 disabled:checked:bg-gray/10 forced-colors:appearance-auto"
            />
            <svg
                viewBox="0 0 14 14"
                fill="none"
                class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25"
            >
                <path
                    d="M3 8L6 11L11 3.5"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="opacity-0 group-has-checked:opacity-100"
                ></path>
                <path
                    d="M3 7H11"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="opacity-0 group-has-indeterminate:opacity-100"
                ></path>
            </svg>
        </div>
        <div class="text-sm grow shrink">
            <span v-html="props.label" />
            <span v-if="props.required" class="text-secondary ml-1">*</span>
        </div>
    </label>
</template>
<script setup lang="ts">
const props = defineProps({
    label: String,
    required: Boolean,
});
const data = defineModel();
</script>
