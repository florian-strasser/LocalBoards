<template>
    <div v-if="props.writeAccess || comments.length > 0">
        <h3 class="text-xl font-bold text-dark dark:text-white">
            {{ $t("commentsAndActivity") }}
        </h3>
        <NewCommentForm
            v-if="props.writeAccess"
            :cardID="props.cardID"
            @Comment-created="handleCommentCreated"
        />
        <CommentConnection
            :cardID="props.cardID"
            @comment-created="handleCommentCreated"
            @comment-deleted="handleCommentDeleted"
            @comment-updated="handleCommentUpdated"
        />
        <div v-if="comments.length > 0" class="mt-4 space-y-4">
            <div v-for="comment in comments" :key="comment.id">
                <template v-if="commentToDelete !== comment.id">
                    <template v-if="commentToEdit !== comment.id">
                        <div
                            class="rounded-xl border border-dark/10 bg-dark/5 p-4 dark:border-white/10 dark:bg-white/5 sm:p-5"
                        >
                            <CommentContent
                                :content="comment.content"
                                :commentId="comment.id"
                                :cardId="props.cardID"
                                :boardId="getBoardId()"
                                :writeAccess="props.writeAccess"
                                @updated="handleCommentPatched"
                            />
                        </div>
                        <!-- Meta row below the card (not inside it): the comment
                             is the point, so who wrote it and when — plus the
                             owner's edit/delete actions — sit underneath. -->
                        <div class="mt-2 flex items-center gap-3 px-1">
                            <span
                                class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm text-white"
                            >
                                <img
                                    v-if="comment.userImage"
                                    :src="comment.userImage"
                                    class="h-full w-full object-cover"
                                />
                                <template v-else>{{
                                    (comment.userName || "?")
                                        .substring(0, 1)
                                        .toUpperCase()
                                }}</template>
                            </span>
                            <div class="min-w-0 grow">
                                <p class="truncate text-sm">
                                    <span
                                        class="font-medium text-dark dark:text-white"
                                        >{{ comment.userName }}</span
                                    >
                                    <span class="ml-2 text-xs text-gray">{{
                                        formatDate(comment.date)
                                    }}</span>
                                </p>
                            </div>
                            <div
                                v-if="comment.user === currentUserId"
                                class="flex shrink-0 items-center gap-1"
                            >
                                <button
                                    type="button"
                                    @click="startEditing(comment)"
                                    v-tooltip="$t('edit')"
                                    class="flex size-8 cursor-pointer items-center justify-center rounded-lg text-gray transition-colors hover:bg-primary/10 hover:text-primary"
                                >
                                    <Pen class="size-4" />
                                </button>
                                <button
                                    type="button"
                                    @click="confirmDelete(comment.id)"
                                    v-tooltip="$t('deleteMessage')"
                                    class="flex size-8 cursor-pointer items-center justify-center rounded-lg text-gray transition-colors hover:bg-primary/10 hover:text-primary"
                                >
                                    <Trash2 class="size-4" />
                                </button>
                            </div>
                        </div>
                    </template>
                    <template v-else>
                        <div
                            class="rounded-xl border border-dark/10 bg-dark/5 p-4 dark:border-white/10 dark:bg-white/5 sm:p-5"
                        >
                            <CardEditor v-model="editingContent" />
                            <div class="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    @click="saveEdit(comment.id)"
                                    class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
                                >
                                    {{ $t("save") }}
                                </button>
                                <button
                                    type="button"
                                    @click="cancelEdit"
                                    class="rounded-lg bg-primary/10 px-4 text-primary hover:bg-primary-hover hover:text-white dark:bg-white/10 dark:text-white"
                                >
                                    <X class="size-5" />
                                </button>
                            </div>
                        </div>
                    </template>
                </template>
                <template v-else>
                    <div
                        class="rounded-xl border border-dark/10 bg-dark/5 p-4 dark:border-white/10 dark:bg-white/5 sm:p-5"
                    >
                        <p>{{ $t("confirmDeleteComment") }}</p>
                        <div class="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                class="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover"
                                @click="executeDelete(comment.id)"
                                v-html="$t('delete')"
                            />
                            <button
                                type="button"
                                @click="cancelDelete"
                                class="rounded-lg bg-primary/10 px-4 text-primary hover:bg-primary-hover hover:text-white dark:bg-white/10 dark:text-white"
                            >
                                <X class="size-5" />
                            </button>
                        </div>
                    </div>
                </template>
            </div>
        </div>
        <div v-else class="mt-4">{{ $t("noCommentsYet") }}</div>
    </div>
</template>

<script setup lang="ts">
import { Pen, Trash2, X } from "lucide-vue-next";
import { socket } from "~/lib/socket";
import type { PropType } from "vue";

const props = defineProps({
    cardID: Number,
    boardID: Number,
    writeAccess: Boolean,
    currentUserId: String,
    initialComments: {
        type: Array as PropType<Comment[]>,
        default: () => [],
    },
});

const getBoardId = () => {
    return props.boardID;
};

const emits = defineEmits([
    "comment-created",
    "comment-deleted",
    "comment-updated",
    "comment-count-updated",
]);

// Local state for comments to handle additions and deletions
const comments = ref<Comment[]>([...props.initialComments]);

// State for comment deletion confirmation
const commentToDelete = ref<number | null>(null);

const confirmDelete = (commentId: number) => {
    commentToDelete.value = commentId;
};

const cancelDelete = () => {
    commentToDelete.value = null;
};

const executeDelete = async (commentId: number) => {
    await deleteComment(commentId);
    commentToDelete.value = null;
};

// State for comment editing
const commentToEdit = ref<number | null>(null);
const editingContent = ref<string>("");

const startEditing = (comment: Comment) => {
    commentToEdit.value = comment.id;
    editingContent.value = comment.content;
};

const cancelEdit = () => {
    commentToEdit.value = null;
    editingContent.value = "";
};

const saveEdit = async (commentId: number) => {
    try {
        const updatedComment = await $fetch(`/api/data/comment`, {
            method: "PUT",
            body: {
                id: commentId,
                content: editingContent.value,
            },
        });

        if (updatedComment.comment) {
            // Emit socket event for real-time updates
            socket.emit("commentUpdated", {
                cardID: props.cardID,
                comment: updatedComment.comment,
            });

            // Update local state
            const index = comments.value.findIndex((c) => c.id === commentId);
            if (index !== -1) {
                comments.value[index] = updatedComment.comment;
                emits("comment-updated", updatedComment.comment);
            }
        }

        cancelEdit();
    } catch (err) {
        console.error("Error updating comment:", err);
    }
};

// Handle comment updated from socket
const handleCommentUpdated = (updatedComment: Comment) => {
    const index = comments.value.findIndex((c) => c.id === updatedComment.id);
    if (index !== -1) {
        comments.value[index] = updatedComment;
    }
};

// A checklist checkbox was toggled inside a comment (CommentContent PATCHed it).
// Sync local state, broadcast to other users, and bubble it up so the board's
// prefetched card stays fresh on reopen.
const handleCommentPatched = (updatedComment: Comment) => {
    const index = comments.value.findIndex((c) => c.id === updatedComment.id);
    if (index !== -1) {
        comments.value[index] = updatedComment;
    }
    socket.emit("commentUpdated", {
        cardID: props.cardID,
        comment: updatedComment,
    });
    emits("comment-updated", updatedComment);
};

interface Comment {
    id: number;
    card: number;
    user: string;
    userImage: string;
    userName: string;
    content: string;
    date: string;
}

// Handle the creation of a new comment
const handleCommentCreated = (newComment: Comment) => {
    // Check if comment already exists in the array
    if (!comments.value.some((c) => c.id === newComment.id)) {
        comments.value.unshift(newComment);
        emits("comment-created", newComment);
        emits("comment-count-updated", {
            cardId: props.cardID,
            commentCount: comments.value.length,
        });
        socket.emit("commentCountUpdated", {
            cardId: props.cardID,
            commentCount: comments.value.length,
        });
    }
};

const handleCommentDeleted = (deletedCommentId) => {
    comments.value = comments.value.filter((c) => c.id !== deletedCommentId);
    emits("comment-count-updated", {
        cardId: props.cardID,
        commentCount: comments.value.length,
    });
    socket.emit("commentCountUpdated", {
        boardId: props.boardID,
        cardId: props.cardID,
        commentCount: comments.value.length,
    });
};

// Format the date for display. Explicit 2-digit day/month/hour/minute/second so
// localized formats keep leading zeros (e.g. de-DE "08.07.2026, 23:11:02"
// instead of "8.7.2026, 23:11:02").
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

// Delete a comment by its creator
const deleteComment = async (commentId: number) => {
    try {
        await $fetch(`/api/data/comment?commentId=${commentId}`, {
            method: "DELETE",
        });
        // Remove from local state
        comments.value = comments.value.filter((c) => c.id !== commentId);
        emits("comment-deleted", commentId);
        // Emit socket events for real-time updates
        socket.emit("commentDeleted", {
            cardID: props.cardID,
            commentId,
        });
    } catch (err) {
        console.error("Error deleting comment:", err);
    }
};

// Listen for real-time comment deletions from other users
socket.on(
    "deleteComment",
    ({ cardID, commentId }: { cardID: number; commentId: number }) => {
        if (cardID === props.cardID) {
            comments.value = comments.value.filter((c) => c.id !== commentId);
        }
    },
);

onBeforeUnmount(() => {
    socket.off("deleteComment");
});
</script>
