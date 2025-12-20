<template>
    <label class="block w-full space-y-1">
        <div class="text-sm">
            {{ props.label
            }}<span v-if="props.required" class="text-secondary ml-1">*</span>
        </div>
        <input
            :type="props.type"
            :required="props.required"
            class="px-4 py-2 block w-full outline-0 border-2 border-gray/30 focus:border-primary rounded-lg"
            v-model="data"
        />
    </label>
</template>
<script setup lang="ts">
const props = defineProps({
    type: String,
    label: String,
    required: Boolean,
});
const data = defineModel();
</script>
