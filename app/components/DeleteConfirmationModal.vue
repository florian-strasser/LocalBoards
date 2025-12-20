<template>
    <ModalWindow v-model="isOpen">
        <h2 class="text-4xl text-primary mb-3">
            {{ title }}
        </h2>
        <p class="mb-6">{{ message }}</p>
        <button
            @click="confirmDelete"
            type="button"
            class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
        >
            {{ confirmButtonText }}
        </button>
    </ModalWindow>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import ModalWindow from '@/components/ModalWindow.vue';

const props = defineProps({
    modelValue: Boolean,
    title: {
        type: String,
        default: 'Do you want to delete this item?',
    },
    message: {
        type: String,
        default: 'This action cannot be undone.',
    },
    confirmButtonText: {
        type: String,
        default: 'Delete',
    },
    onConfirm: {
        type: Function,
        required: true,
    },
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(props.modelValue);

const confirmDelete = () => {
    props.onConfirm();
    isOpen.value = false;
};

// Watch for changes in modelValue to update isOpen
watch(
    () => props.modelValue,
    (newVal) => {
        isOpen.value = newVal;
    }
);

// Watch for changes in isOpen to emit update:modelValue
watch(
    () => isOpen.value,
    (newVal) => {
        emit('update:modelValue', newVal);
    }
);
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
