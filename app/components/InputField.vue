<template>
    <label class="block w-full space-y-1">
        <div class="text-sm">
            {{ props.label
            }}<span v-if="props.required" class="text-primary ml-1">*</span>
        </div>
        <input
            :type="props.type"
            :required="props.required"
            :readonly="props.readonly"
            class="form-control w-full"
            :class="{ 'opacity-70 cursor-not-allowed': props.readonly }"
            v-model="data"
        />
    </label>
</template>
<script setup lang="ts">
const props = defineProps({
    type: String,
    label: String,
    required: Boolean,
    // Shown but not editable — an invited address, for instance, where the
    // whole point of the token is that it is good for that address only.
    readonly: Boolean,
});
const data = defineModel();
</script>
