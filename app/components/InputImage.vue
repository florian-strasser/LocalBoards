<template>
    <div class="block w-88 max-w-full space-y-1">
        <label class="text-sm">
            {{ props.label }}
        </label>
        <div class="flex gap-2">
            <div class="w-34">
                <div
                    class="aspect-square relative rounded-lg bg-slate dark:bg-white/10"
                    @click="triggerFileInput"
                    @dragover.prevent="handleDragOver"
                    @dragleave.prevent="handleDragLeave"
                    @drop.prevent="handleDrop"
                    :class="{
                        'border-2 border-dashed border-secondary': isDragging,
                        'cursor-pointer': !data,
                    }"
                >
                    <img
                        v-if="data"
                        :src="data"
                        class="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
                    />
                    <div
                        v-else
                        class="absolute inset-0 flex flex-col justify-center items-center text-center p-2"
                    >
                        <Plus class="size-6" />
                    </div>
                    <div v-if="data" class="absolute top-1 right-1">
                        <button
                            type="button"
                            class="flex justify-center items-center w-8 h-7 bg-primary hover:bg-secondary text-white rounded-md"
                            @click.stop="data = undefined"
                            v-tooltip="$t('remove')"
                        >
                            <Trash2 class="size-4" />
                        </button>
                    </div>
                </div>
                <input
                    type="file"
                    ref="fileInput"
                    accept="image/*"
                    class="hidden"
                    @change="handleFileUpload"
                />
            </div>
            <div class="flex gap-2 flex-wrap max-w-52">
                <div v-for="image in props.images">
                    <button
                        type="button"
                        class="relative aspect-square w-16 rounded-lg overflow-clip"
                        :class="{
                            'border-2 border-secondary': data === image,
                        }"
                        @click="data = image"
                    >
                        <img
                            :src="image"
                            class="absolute top-0 left-0 w-full h-full object-cover"
                        />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Plus, Trash2 } from "lucide-vue-next";

const props = defineProps({
    label: String,
    images: Array,
});

const data = defineModel();
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const triggerFileInput = () => {
    if (!data.value && fileInput.value) {
        fileInput.value.click();
    }
};

const handleDragOver = (event: DragEvent) => {
    if (!data.value) {
        isDragging.value = true;
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "copy";
        }
    }
};

const handleDragLeave = () => {
    isDragging.value = false;
};

const handleDrop = (event: DragEvent) => {
    if (!data.value && event.dataTransfer?.files.length) {
        isDragging.value = false;
        const file = event.dataTransfer.files[0];
        if (file.type.startsWith("image/")) {
            uploadImage(file);
        }
    }
};

const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
        const file = target.files[0];
        if (file.type.startsWith("image/")) {
            uploadImage(file);
        }
    }
};

const uploadImage = async (file: File) => {
    try {
        // Upload the file to the server
        const imageUrl = await uploadFileToServer(file);
        data.value = imageUrl;
    } catch (error) {
        console.error("Error uploading image:", error);
        // Fallback to base64 for backward compatibility
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = () => {
            data.value = fileReader.result;
        };
    }
};

const uploadFileToServer = async (file: File) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await $fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        return response.url;
    } catch (error) {
        console.error("File upload failed:", error);
        // Fallback to base64 for backward compatibility
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = e.target.result.split(",")[1];
                resolve(base64Data);
            };
            reader.readAsDataURL(file);
        });
    }
};
</script>
