<template>
    <div>
        <div v-if="card" class="card-modal text-left">
            <div v-if="deleteModal" class="w-full">
                <h2 class="text-4xl text-dark dark:text-white text-center mb-4">
                    {{ $t("deleteCardTitle") }}
                </h2>
                <button
                    @click="deleteCard"
                    type="button"
                    class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
                >
                    {{ $t("deleteCardBtn") }}
                </button>
            </div>
            <div v-else-if="addAttachments" class="w-full">
                <div class="relative space-y-4 text-center">
                    <div
                        @dragover.prevent="handleDragOver"
                        @drop.prevent="handleDrop"
                        class="border-2 grow flex justify-center items-center border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary"
                    >
                        <p class="text-gray">
                            {{ $t("dragAndDropFilesHere") }}
                        </p>
                    </div>
                    <button
                        type="button"
                        @click="addAttachments = false"
                        class="hover:text-secondary"
                    >
                        {{ $t("back") }}
                    </button>
                </div>
            </div>
            <div v-else>
                <div class="flex gap-3 mb-4">
                    <button
                        type="button"
                        :disabled="!props.writeAccess"
                        class="flex items-center justify-center size-8 rounded-full shrink-0 grow-0"
                        @click="toggleStatus"
                        :class="{
                            'bg-primary border-2 border-primary text-white':
                                currentStatus,
                            'border-2 border-gray hover:border-primary text-white dark:text-slate':
                                !currentStatus && writeAccess,
                            'border-2 border-gray text-white dark:text-slate':
                                !currentStatus && !writeAccess,
                        }"
                    >
                        <Check class="size-4" />
                    </button>
                    <div class="grow shrink">
                        <div
                            ref="cardTitle"
                            contenteditable="plaintext-only"
                            @blur="saveCard"
                            class="text-2xl font-bold text-dark dark:text-white w-full"
                        >
                            {{ name }}
                        </div>
                    </div>
                    <div class="grow-0 shrink-0 pt-1.5">
                        <button
                            v-if="writeAccess"
                            type="button"
                            class="block hover:text-secondary"
                            @click="deleteModal = true"
                        >
                            <Trash2 class="size-5" />
                        </button>
                    </div>
                </div>
                <div class="mb-4">
                    <template v-if="writeAccess && editingDescription">
                        <CardEditor v-model="content" />
                        <button
                            type="button"
                            class="mt-2 bg-primary hover:bg-secondary px-4 py-2 rounded-lg text-white"
                            @click="editingDescription = false"
                        >
                            {{ $t("save") }}
                        </button>
                    </template>
                    <template v-else>
                        <div
                            v-if="content"
                            class="wysiwyg-wrapper"
                            v-html="content"
                        />
                        <button
                            v-if="writeAccess"
                            type="button"
                            class="mt-2 bg-primary hover:bg-secondary px-4 py-2 flex gap-x-1 items-center rounded-lg text-white"
                            @click="editingDescription = true"
                        >
                            <Pencil class="size-5" />
                            <span>{{ $t("editDescription") }}</span>
                        </button>
                    </template>
                </div>
                <div v-if="writeAccess" class="mb-4">
                    <button
                        type="button"
                        class="flex gap-x-2 items-center hover:text-secondary"
                        @click="addAttachments = true"
                    >
                        <Paperclip class="size-5 shrink-0 grow-0" />
                        <div class="shrink grow">
                            {{ $t("addAttachments") }}
                        </div>
                    </button>
                </div>
                <div v-if="attachments.length > 0" class="mb-4">
                    <h3
                        class="text-xl font-bold text-dark dark:text-white mb-2"
                    >
                        {{ $t("attachments") }}
                    </h3>
                    <ul class="space-y-2">
                        <li
                            v-for="attachment in attachments"
                            :key="attachment.id"
                        >
                            <a
                                @click="downloadAttachment(attachment)"
                                class="flex w-full items-center justify-between bg-dark/10 dark:bg-white/10 hover:bg-secondary hover:text-white px-6 py-4 rounded-xl text-left"
                            >
                                <div class="shrink grow">
                                    <span>{{ attachment.filename }}</span>
                                </div>
                                <Download class="size-5 shrink-0" />
                            </a>
                        </li>
                    </ul>
                </div>
                <CommentSection
                    :cardID="props.cardID"
                    :boardID="props.boardID"
                    :writeAccess="props.writeAccess"
                    :currentUserId="props.userID"
                    :initialComments="comments"
                    @comment-created="handleCommentCreated"
                    @comment-deleted="handleCommentDeleted"
                />
            </div>
        </div>
        <div v-else>Loading...</div>
    </div>
</template>
<script setup lang="ts">
import { socket } from "~/lib/socket";
import { Check, Trash2, Paperclip, Download, X, Pencil } from "lucide-vue-next";
const props = defineProps({
    card: Object,
    cardID: Number,
    boardID: Number,
    writeAccess: Boolean,
    userID: String,
    // True only when opening a freshly created card for the first time, so the
    // editor is shown immediately instead of the read-only view.
    openInEditMode: Boolean,
});

const nuxtApp = useNuxtApp();
const emits = defineEmits([
    "card-updated",
    "card-deleted",
    "comment-count-updated",
]);

const boxOpen = defineModel();

// The card (incl. comments and attachment metadata) is prefetched on the
// board and passed in as a prop, so the modal renders instantly without an
// extra round trip.
const name = ref(props.card.name);
const content = ref(props.card.content);
const currentStatus = ref(!!props.card.status);

const cardTitle = ref(null);
const deleteModal = ref(false);
const addAttachments = ref(false);
// Write-access users see the read-only description with an "edit description"
// button by default; the editor is only shown right away for a freshly created
// card opened for the first time.
const editingDescription = ref(!!props.openInEditMode);
const attachments = ref([...(props.card.attachments || [])]);
const newAttachments = ref([]);
const comments = ref(props.card.comments || []);

const handleCommentCreated = (newComment) => {
    comments.value.unshift(newComment);
    emits("comment-count-updated", {
        cardId: props.cardID,
        commentCount: comments.value.length,
        comments: comments.value,
    });
    socket.emit("commentCountUpdated", {
        boardId: props.boardID,
        cardId: props.cardID,
        commentCount: comments.value.length,
    });
};

const handleCommentDeleted = (deletedCommentId) => {
    comments.value = comments.value.filter((c) => c.id !== deletedCommentId);
    emits("comment-count-updated", {
        cardId: props.cardID,
        commentCount: comments.value.length,
        comments: comments.value,
    });
    socket.emit("commentCountUpdated", {
        boardId: props.boardID,
        cardId: props.cardID,
        commentCount: comments.value.length,
    });
};

const toggleStatus = () => {
    currentStatus.value = !currentStatus.value;
    saveCard();
};

// Function to handle drag over event
const handleDragOver = (event) => {
    event.dataTransfer.dropEffect = "copy";
};

// Function to upload file to server
const uploadFileToServer = async (file) => {
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

// Function to handle drop event
const handleDrop = async (event) => {
    const files = event.dataTransfer.files;
    const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "image/jpg",
        "image/jpeg",
        "image/png",
        "application/zip",
    ];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (allowedTypes.includes(file.type)) {
            const fileData = await uploadFileToServer(file);

            const attachment = {
                filename: file.name,
                filetype: file.type,
                filesize: file.size,
                filedata: fileData,
                isUrl:
                    typeof fileData === "string" &&
                    (fileData.startsWith("http") || fileData.startsWith("/")),
            };

            newAttachments.value.push(attachment);
            await saveCard();
        } else {
            await nuxtApp.callHook("app:toast", {
                message: $t("wrongFileType"),
            });
        }
    }
    addAttachments.value = false;
};

// Function to download an attachment. The file payload (filedata) is not
// included in the prefetched card data to keep the board response lean, so it
// is fetched on demand here.
const downloadAttachment = async (attachment) => {
    try {
        const file = await $fetch(`/api/data/attachment?id=${attachment.id}`);
        const filedata = file.filedata;

        // Handle both URL-based and base64-based attachments
        if (
            filedata &&
            (filedata.startsWith("http") || filedata.startsWith("/"))
        ) {
            // If it's a URL, open it in a new tab for download
            window.open(filedata, "_blank");
        } else {
            // If it's base64, use the data URL approach
            const link = document.createElement("a");
            link.href = `data:${file.filetype};base64,${filedata}`;
            link.download = file.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error("Failed to download attachment:", error);
    }
};

// Function to save the card data
const saveCard = async () => {
    if (cardTitle.value) {
        name.value = cardTitle.value.textContent || name.value;
    }

    try {
        const response = await $fetch(`/api/data/card`, {
            method: "PUT",
            body: {
                cardID: props.cardID,
                name: name.value,
                content: content.value,
                status: currentStatus.value,
                files: newAttachments.value,
            },
        });
        // Update the attachments list with the new attachments
        if (response.attachments) {
            attachments.value = [...attachments.value, ...response.attachments];
            newAttachments.value = []; // Clear new attachments after saving
        }

        // Include the prefetched comments and attachment metadata so the
        // board keeps a complete card object and the modal can be reopened
        // without a layout shift.
        emits("card-updated", {
            ...response.card,
            comments: comments.value,
            attachments: attachments.value.map(
                ({ filedata, ...meta }) => meta,
            ),
        });
        socket.emit("cardUpdated", {
            boardId: props.boardID,
            attachments: attachments.value,
            card: response.card,
        });
    } catch (err) {
        console.error("Failed to save card:", err);
    }
};

const deleteCard = async () => {
    try {
        const response = await $fetch(`/api/data/card`, {
            method: "DELETE",
            body: {
                cardID: props.cardID,
                name: name.value,
                content: content.value,
                status: currentStatus.value,
            },
        });

        await nuxtApp.callHook("app:toast", {
            message: $t("cardDeleted"),
        });
        boxOpen.value = false;
        document.body.style.overflow = "auto";
        emits("card-deleted", props.card);
        socket.emit("cardDeleted", {
            boardId: props.boardID,
            card: props.card,
        });
    } catch (err) {
        console.error("Failed to deleted card:", err);
    }
};

// Handle card updates from other users
const handleCardUpdated = (updatedCard, updatedAttachments) => {
    if (updatedCard.id === props.cardID) {
        name.value = updatedCard.name;
        content.value = updatedCard.content;
        currentStatus.value = updatedCard.status;
        // Update attachments if they exist in the updated card
        if (updatedAttachments) {
            attachments.value = updatedAttachments;
        }
    }
};

// Set up socket event listener for card updates
onMounted(() => {
    socket.on("updateCard", ({ card, attachments, boardId }) => {
        if (props.boardID === boardId && card.id === props.cardID) {
            handleCardUpdated(card, attachments);
        }
    });
});

onBeforeUnmount(() => {
    socket.off("updateCard", handleCardUpdated);
});

// Watch for changes in name, content, or currentStatus
watch(
    [content],
    () => {
        saveCard();
    },
    { deep: true },
);
</script>
