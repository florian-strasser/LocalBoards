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
                        @click="fileInput?.click()"
                        @dragover.prevent="handleDragOver"
                        @dragleave.prevent="isDragging = false"
                        @drop.prevent="handleDrop"
                        class="border-2 border-dashed rounded-lg p-8 min-h-48 flex flex-col gap-2 justify-center items-center text-center cursor-pointer transition-colors"
                        :class="
                            isDragging
                                ? 'border-primary bg-primary/10'
                                : 'border-gray/40 hover:border-primary'
                        "
                    >
                        <Upload class="size-8 text-gray shrink-0" />
                        <p class="text-gray">
                            {{ $t("dragAndDropFilesHere") }}
                        </p>
                    </div>
                    <input
                        ref="fileInput"
                        type="file"
                        multiple
                        :accept="attachmentAccept"
                        class="hidden"
                        @change="handleFileSelect"
                    />
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
                <!-- Card metadata: due date, reminders and assignee live behind
                     Trello-style popovers. When unset a button shows the field
                     name; once set the button shows the value and reopens the
                     menu when clicked. -->
                <div
                    v-if="writeAccess || dueDate || assignee"
                    class="mb-4 flex flex-wrap items-center gap-2"
                >
                    <!-- Due date -->
                    <PopoverMenu v-if="writeAccess">
                        <template #trigger>
                            <button type="button" :class="chipClass(!!dueDate)">
                                <Clock class="size-4 shrink-0" />
                                <span>{{
                                    dueDate
                                        ? formatDateTime(dueDate)
                                        : $t("dueDate")
                                }}</span>
                            </button>
                        </template>
                        <template #default>
                            <div class="w-64 space-y-3">
                                <div>
                                    <label
                                        class="block text-sm font-bold text-dark dark:text-white mb-1"
                                    >
                                        {{ $t("dueDate") }}
                                    </label>
                                    <input
                                        type="datetime-local"
                                        v-model="dueDateInput"
                                        @change="saveCard"
                                        class="form-control"
                                    />
                                </div>
                                <div v-if="dueDate">
                                    <label
                                        class="block text-sm font-bold text-dark dark:text-white mb-1"
                                    >
                                        {{ $t("reminders") }}
                                    </label>
                                    <ul
                                        v-if="reminders.length"
                                        class="flex flex-wrap gap-2 mb-2"
                                    >
                                        <li
                                            v-for="m in reminders"
                                            :key="m"
                                            class="flex items-center gap-1 bg-primary/10 dark:bg-white/10 text-dark dark:text-white px-3 py-1 rounded-full text-sm"
                                        >
                                            <Bell class="size-4 shrink-0" />
                                            <span>{{ reminderLabel(m) }}</span>
                                            <button
                                                type="button"
                                                @click="removeReminder(m)"
                                                class="hover:text-secondary"
                                            >
                                                <X class="size-4" />
                                            </button>
                                        </li>
                                    </ul>
                                    <select
                                        v-if="availableReminderPresets.length"
                                        @change="addReminder"
                                        class="form-control text-sm"
                                    >
                                        <option value="">
                                            {{ $t("addReminder") }}
                                        </option>
                                        <option
                                            v-for="preset in availableReminderPresets"
                                            :key="preset.minutes"
                                            :value="preset.minutes"
                                        >
                                            {{ $t(preset.label) }}
                                        </option>
                                    </select>
                                </div>
                                <button
                                    v-if="dueDate"
                                    type="button"
                                    @click="clearDueDate"
                                    class="flex items-center gap-1 text-sm text-primary hover:text-secondary"
                                >
                                    <X class="size-4" />
                                    <span>{{ $t("delete") }}</span>
                                </button>
                            </div>
                        </template>
                    </PopoverMenu>
                    <div v-else-if="dueDate" :class="chipClass(true)">
                        <Clock class="size-4 shrink-0" />
                        <span>{{ formatDateTime(dueDate) }}</span>
                    </div>

                    <!-- Assignee -->
                    <PopoverMenu v-if="writeAccess">
                        <template #trigger>
                            <button
                                type="button"
                                :class="chipClass(!!assignee)"
                            >
                                <span
                                    v-if="assignee && assigneeImage"
                                    class="size-5 rounded-full overflow-hidden shrink-0"
                                >
                                    <img
                                        :src="assigneeImage"
                                        class="w-full h-full object-cover"
                                    />
                                </span>
                                <UserPlus v-else class="size-4 shrink-0" />
                                <span>{{
                                    assignee ? assigneeName : $t("assignee")
                                }}</span>
                            </button>
                        </template>
                        <template #default="{ close }">
                            <div class="w-56">
                                <label
                                    class="block text-sm font-bold text-dark dark:text-white mb-2"
                                >
                                    {{ $t("assignee") }}
                                </label>
                                <ul
                                    class="space-y-1 max-h-60 overflow-auto"
                                >
                                    <li>
                                        <button
                                            type="button"
                                            @click="setAssignee('', close)"
                                            class="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-primary/10 dark:hover:bg-white/10 text-dark dark:text-white"
                                        >
                                            <span
                                                class="size-6 rounded-full bg-gray/20 flex items-center justify-center shrink-0"
                                            >
                                                <X class="size-3.5" />
                                            </span>
                                            <span class="grow text-left">{{
                                                $t("unassigned")
                                            }}</span>
                                            <Check
                                                v-if="!assignee"
                                                class="size-4 text-primary shrink-0"
                                            />
                                        </button>
                                    </li>
                                    <li v-for="m in members" :key="m.id">
                                        <button
                                            type="button"
                                            @click="setAssignee(m.id, close)"
                                            class="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-primary/10 dark:hover:bg-white/10 text-dark dark:text-white"
                                        >
                                            <span
                                                class="size-6 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center shrink-0 text-xs"
                                            >
                                                <img
                                                    v-if="m.image"
                                                    :src="m.image"
                                                    class="w-full h-full object-cover"
                                                />
                                                <template v-else>{{
                                                    (m.name || "?").charAt(0)
                                                }}</template>
                                            </span>
                                            <span class="grow text-left">{{
                                                m.name
                                            }}</span>
                                            <Check
                                                v-if="assignee === m.id"
                                                class="size-4 text-primary shrink-0"
                                            />
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </template>
                    </PopoverMenu>
                    <div v-else-if="assignee" :class="chipClass(true)">
                        <span
                            v-if="assigneeImage"
                            class="size-5 rounded-full overflow-hidden shrink-0"
                        >
                            <img
                                :src="assigneeImage"
                                class="w-full h-full object-cover"
                            />
                        </span>
                        <UserPlus v-else class="size-4 shrink-0" />
                        <span>{{ assigneeName }}</span>
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
                            v-html="sanitizeHtml(content)"
                            @click="handleDescriptionClick"
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

                <!-- Attachments: the add button sits below the list when one
                     exists, otherwise it stands on its own. -->
                <div v-if="attachments.length > 0 || writeAccess" class="mb-4">
                    <div v-if="attachments.length > 0" class="mb-2">
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
                                    <div class="shrink grow min-w-0 fade-clip">
                                        <span>{{ attachment.filename }}</span>
                                    </div>
                                    <Download class="size-5 shrink-0 ml-2" />
                                </a>
                            </li>
                        </ul>
                    </div>
                    <button
                        v-if="writeAccess"
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
                <CommentSection
                    :cardID="props.cardID"
                    :boardID="props.boardID"
                    :writeAccess="props.writeAccess"
                    :currentUserId="props.userID"
                    :initialComments="comments"
                    @comment-created="handleCommentCreated"
                    @comment-deleted="handleCommentDeleted"
                />
                <ImageWindow v-model="imageModalOpen" bare>
                    <img
                        :src="selectedImageSrc"
                        class="w-full h-full object-contain max-h-[calc(100vh-4rem)]"
                        :alt="selectedImageAlt || 'Enlarged image'"
                    />
                </ImageWindow>
            </div>
        </div>
        <div v-else>Loading...</div>
    </div>
</template>
<script setup lang="ts">
import { socket } from "~/lib/socket";
import {
    Check,
    Trash2,
    Paperclip,
    Download,
    X,
    Pencil,
    Bell,
    Clock,
    UserPlus,
    Upload,
} from "lucide-vue-next";
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
const isDragging = ref(false); // highlight the drop zone while a file is over it
const fileInput = ref(null); // hidden <input type="file"> for click-to-select
// Write-access users see the read-only description with an "edit description"
// button by default; the editor is only shown right away for a freshly created
// card opened for the first time.
const editingDescription = ref(!!props.openInEditMode);
const attachments = ref([...(props.card.attachments || [])]);
const newAttachments = ref([]);
const comments = ref(props.card.comments || []);

// --- Due date, assignee & reminders -------------------------------------
const dueDate = ref(props.card.dueDate || ""); // ISO string, or "" when unset
const assignee = ref(props.card.assignee || "");
const reminders = ref([...(props.card.reminders || [])]);
const members = ref([]); // board members for the assignee picker

// Shared chip/button style for the metadata popover triggers. Filled when the
// field holds a value, subtler when it's still an "add" prompt.
const chipClass = (isSet) =>
    "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-dark dark:text-white " +
    (isSet
        ? "bg-primary/10 dark:bg-white/10 hover:bg-primary/20 dark:hover:bg-white/20"
        : "bg-dark/5 dark:bg-white/10 hover:bg-dark/10 dark:hover:bg-white/20");

const REMINDER_PRESETS = [
    { minutes: 0, label: "reminderAtDueTime" },
    { minutes: 5, label: "reminder5min" },
    { minutes: 15, label: "reminder15min" },
    { minutes: 30, label: "reminder30min" },
    { minutes: 60, label: "reminder1hour" },
    { minutes: 1440, label: "reminder1day" },
    { minutes: 10080, label: "reminder1week" },
];

const availableReminderPresets = computed(() =>
    REMINDER_PRESETS.filter((p) => !reminders.value.includes(p.minutes)),
);

const reminderLabel = (minutes) => {
    const preset = REMINDER_PRESETS.find((p) => p.minutes === minutes);
    return preset ? $t(preset.label) : `${minutes} min`;
};

const assigneeName = computed(() => {
    if (!assignee.value) return "";
    const member = members.value.find((m) => m.id === assignee.value);
    return member ? member.name : props.card.assigneeName || "";
});

const assigneeImage = computed(() => {
    if (!assignee.value) return "";
    const member = members.value.find((m) => m.id === assignee.value);
    return member ? member.image : props.card.assigneeImage || "";
});

const setAssignee = (id, close) => {
    assignee.value = id;
    saveCard();
    if (close) close();
};

const pad = (n) => String(n).padStart(2, "0");

// Map the stored ISO due date to/from the `datetime-local` input (local time).
const dueDateInput = computed({
    get() {
        if (!dueDate.value) return "";
        const d = new Date(dueDate.value);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
    set(value) {
        dueDate.value = value ? new Date(value).toISOString() : "";
    },
});

const formatDateTime = (iso) =>
    new Date(iso).toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const clearDueDate = () => {
    dueDate.value = "";
    saveCard();
};

const addReminder = (event) => {
    const raw = event.target.value;
    event.target.value = ""; // reset the picker back to the placeholder
    if (raw === "") return;
    const minutes = Number(raw);
    if (!Number.isFinite(minutes) || reminders.value.includes(minutes)) return;
    reminders.value.push(minutes);
    reminders.value.sort((a, b) => a - b);
    saveCard();
};

const removeReminder = (minutes) => {
    reminders.value = reminders.value.filter((m) => m !== minutes);
    saveCard();
};

// Click-to-enlarge for images in the read-only description, mirroring the
// behaviour of images in comments (CommentContent.vue).
const imageModalOpen = ref(false);
const selectedImageSrc = ref("");
const selectedImageAlt = ref("");

const handleDescriptionClick = (event) => {
    const target = event.target;
    if (target.tagName === "IMG") {
        event.preventDefault();
        selectedImageSrc.value = target.getAttribute("src") || "";
        selectedImageAlt.value = target.getAttribute("alt") || "";
        imageModalOpen.value = true;
    }
};

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

// Accepted attachment MIME types — shared by the drop handler and the file
// picker's `accept` filter.
const ATTACHMENT_TYPES = [
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
const attachmentAccept = ATTACHMENT_TYPES.join(",");

// Function to handle drag over event
const handleDragOver = (event) => {
    event.dataTransfer.dropEffect = "copy";
    isDragging.value = true;
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

// Upload and attach the given files (shared by drag-drop and the file picker).
const processFiles = async (files) => {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (ATTACHMENT_TYPES.includes(file.type)) {
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

// Function to handle drop event
const handleDrop = async (event) => {
    isDragging.value = false;
    await processFiles(event.dataTransfer.files);
};

// Function to handle click-to-select via the hidden file input
const handleFileSelect = async (event) => {
    // Copy out of the live FileList before resetting the input — clearing
    // `value` empties `event.target.files`, so processing must use the copy.
    const files = Array.from(event.target.files);
    // Reset so selecting the same file again still fires `change`.
    event.target.value = "";
    await processFiles(files);
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
                dueDate: dueDate.value || null,
                assignee: assignee.value || null,
                reminders: reminders.value,
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
        const assigneeMember = members.value.find(
            (m) => m.id === (response.card.assignee || ""),
        );
        emits("card-updated", {
            ...response.card,
            comments: comments.value,
            attachments: attachments.value.map(
                ({ filedata, ...meta }) => meta,
            ),
            reminders: response.card.reminders ?? reminders.value,
            assigneeName: assigneeMember?.name ?? null,
            assigneeImage: assigneeMember?.image ?? null,
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
        if (updatedCard.dueDate !== undefined)
            dueDate.value = updatedCard.dueDate || "";
        if (updatedCard.assignee !== undefined)
            assignee.value = updatedCard.assignee || "";
        if (Array.isArray(updatedCard.reminders))
            reminders.value = [...updatedCard.reminders];
        // Update attachments if they exist in the updated card
        if (updatedAttachments) {
            attachments.value = updatedAttachments;
        }
    }
};

// Load the board members for the assignee picker.
onMounted(async () => {
    if (!props.writeAccess) return;
    try {
        const data = await $fetch(
            `/api/data/members?boardId=${props.boardID}`,
        );
        if (data?.members) members.value = data.members;
    } catch (err) {
        console.error("Failed to load board members:", err);
    }
});

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
