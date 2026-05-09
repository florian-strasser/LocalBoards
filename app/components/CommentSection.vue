<template>
    <div v-if="props.writeAccess || comments.length > 0">
        <h3 class="text-xl font-bold text-primary dark:text-white">
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
                            class="relative bg-dark/10 dark:bg-white/10 p-6 rounded-xl"
                        >
                            <div class="w-5 absolute top-1 right-1">
                                <button
                                    v-if="comment.user === currentUserId"
                                    type="button"
                                    @click="startEditing(comment)"
                                    class="size-5 flex justify-center items-center hover:text-secondary"
                                    v-tooltip="$t('edit')"
                                >
                                    <Pen class="size-3" />
                                </button>
                            </div>
                            <CommentContent
                                :content="comment.content"
                                :commentId="comment.id"
                                :cardId="props.cardID"
                                :boardId="getBoardId()"
                                :writeAccess="props.writeAccess"
                            />
                        </div>
                        <div class="flex mt-2 items-center gap-x-2 flex-wrap">
                            <div
                                class="flex items-center gap-x-2 shrink-0 grow"
                            >
                                <div class="w-8 shrink-0 grow-0">
                                    <div
                                        class="relative aspect-square rounded-full overflow-clip"
                                    >
                                        <img
                                            v-if="comment.userImage"
                                            :src="comment.userImage"
                                            class="absolute top-0 left-0 w-full h-full object-cover"
                                        />
                                        <div
                                            v-else
                                            class="absolute top-0 left-0 w-full h-full bg-primary text-white flex justify-center items-center"
                                        >
                                            {{
                                                comment.userName.substring(0, 1)
                                            }}
                                        </div>
                                    </div>
                                </div>
                                <p class="text-sm grow shrink">
                                    {{ comment.userName }} |
                                    {{ formatDate(comment.date) }}
                                </p>
                            </div>
                            <div
                                v-if="comment.user === currentUserId"
                                class="flex items-center gap-2"
                            >
                                <button
                                    @click="confirmDelete(comment.id)"
                                    v-tooltip="$t('deleteMessage')"
                                    class="text-sm hover:text-secondary shrink-0 grow-0"
                                >
                                    <Trash2 class="size-4" />
                                </button>
                            </div>
                        </div>
                    </template>
                    <template v-else>
                        <div class="bg-dark/10 dark:bg-white/10 p-6 rounded-xl">
                            <CardEditor v-model="editingContent" />
                        </div>
                        <div class="flex gap-2 flex-wrap mt-2">
                            <button
                                type="button"
                                @click="saveEdit(comment.id)"
                                class="bg-primary hover:bg-secondary px-4 py-2 rounded-lg text-white"
                            >
                                {{ $t("save") }}
                            </button>
                            <button
                                type="button"
                                @click="cancelEdit"
                                class="px-4 bg-primary/10 text-primary dark:bg-white/10 dark:text-white hover:bg-secondary hover:text-white rounded-lg"
                            >
                                <X class="size-5" />
                            </button>
                        </div>
                    </template>
                </template>
                <template v-else>
                    <div
                        class="flex flex-col gap-y-2 bg-dark/10 dark:bg-white/10 p-6 rounded-xl"
                    >
                        <p>
                            {{ $t("confirmDeleteComment") }}
                        </p>
                    </div>
                    <div class="flex gap-2 flex-wrap mt-2">
                        <button
                            type="button"
                            class="bg-primary hover:bg-secondary px-4 py-2 rounded-lg text-white"
                            @click="executeDelete(comment.id)"
                            v-html="$t('delete')"
                        />
                        <button
                            type="button"
                            @click="cancelDelete"
                            class="px-4 bg-primary/10 text-primary dark:bg-white/10 dark:text-white hover:bg-secondary hover:text-white rounded-lg"
                        >
                            <X class="size-5" />
                        </button>
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

const { data: session } = await useFetch("/api/auth/get-session");
const currentUserId = session.value?.data?.user?.id;

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

// Format the date for display
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
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
