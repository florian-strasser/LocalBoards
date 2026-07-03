<template>
    <label class="block w-full space-y-1">
        <div class="text-sm">
            {{ props.label
            }}<span v-if="props.required" class="text-primary ml-1">*</span>
        </div>
        <input
            :type="props.type"
            :required="props.required"
            class="form-control"
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
