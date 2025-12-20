<template>
    <ModalWindow v-model="isOpen">
        <div>
            <form @submit.prevent="saveBoard" class="text-left space-y-5">
                <div>
                    <label
                        for="boardName"
                        class="block text-sm/6 font-medium text-gray"
                        >Board Name</label
                    >
                    <InputField
                        type="text"
                        name="boardName"
                        :required="true"
                        v-model="newBoardName"
                    />
                </div>
                <div>
                    <label class="block text-sm/6 font-medium text-gray"
                        >Style</label
                    >
                    <RadioList
                        :values="['kanban', 'todo']"
                        name="style"
                        v-model="newBoardStyle"
                    />
                </div>
                <div>
                    <label class="block text-sm/6 font-medium text-gray"
                        >Status</label
                    >
                    <RadioList
                        :values="['private', 'public']"
                        name="status"
                        v-model="newBoardStatus"
                    />
                </div>
                <input
                    type="submit"
                    class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                    value="Save Board"
                />
            </form>
        </div>
    </ModalWindow>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useToast } from '@/composables/useToast';
import { $fetch } from 'ofetch';
import ModalWindow from '@/components/ModalWindow.vue';
import InputField from '@/components/InputField.vue';
import RadioList from '@/components/RadioList.vue';

const props = defineProps({
    modelValue: Boolean,
    boardName: String,
    boardStyle: String,
    boardStatus: String,
    boardID: String,
    userID: String,
});

const emit = defineEmits(['update:modelValue', 'board-saved']);

const isOpen = ref(props.modelValue);
const newBoardName = ref(props.boardName);
const newBoardStyle = ref(props.boardStyle);
const newBoardStatus = ref(props.boardStatus);

const toast = useToast();

const saveBoard = async () => {
    const newName = newBoardName.value.trim();
    if (!newName) return;

    try {
        const data = await $fetch('/api/data/board', {
            method: 'POST',
            body: {
                id: props.boardID === 'new' ? null : props.boardID,
                userId: props.userID,
                name: newName,
                style: newBoardStyle.value,
                status: newBoardStatus.value,
            },
        });
        if (!data) {
            console.error('Error updating board');
        } else {
            // If creating a new board, update the route with the new ID
            if (props.boardID === 'new' && data.board?.id) {
                // Update the URL virtually without redirecting
                history.replaceState(null, '', `/board/${data.board.id}`);
            }
            emit('board-saved', {
                name: newBoardName.value,
                style: newBoardStyle.value,
                status: newBoardStatus.value,
                id: data.board?.id || props.boardID,
            });
            isOpen.value = false;
            toast.add({
                title: 'Board saved',
            });
        }
    } catch (err) {
        console.error('Error:', err);
    }
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
