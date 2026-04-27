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
        />
        <div v-if="comments.length > 0" class="mt-4 space-y-4">
            <div v-for="comment in comments" :key="comment.id">
                <div class="bg-dark/10 dark:bg-white/10 p-6 rounded-xl">
                    <div class="wysiwyg-wrapper" v-html="comment.content" />
                </div>
                <div class="flex mt-2 items-center gap-x-2 flex-wrap">
                    <div class="flex items-center gap-x-2 shrink-0 grow">
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
                                    {{ comment.userName.substring(0, 1) }}
                                </div>
                            </div>
                        </div>
                        <p class="text-sm grow shrink">
                            {{ comment.userName }} |
                            {{ formatDate(comment.date) }}
                        </p>
                    </div>
                    <button
                        v-if="comment.user === currentUserId"
                        @click="deleteComment(comment.id)"
                        v-tooltip="$t('deleteMessage')"
                        class="text-sm hover:text-secondary shrink-0 grow-0"
                    >
                        <Trash2 class="size-4" />
                    </button>
                </div>
            </div>
        </div>
        <div v-else class="mt-4">{{ $t("noCommentsYet") }}</div>
    </div>
</template>

<script setup lang="ts">
import { Trash2 } from "lucide-vue-next";
import { socket } from "~/lib/socket";
import { onBeforeUnmount, ref } from "vue";
import type { PropType } from "vue";

const props = defineProps({
    cardID: Number,
    writeAccess: Boolean,
    initialComments: {
        type: Array as PropType<Comment[]>,
        default: () => [],
    },
});

const emits = defineEmits([
    "comment-created",
    "comment-deleted",
    "comment-count-updated",
]);

const { data: session } = await useFetch("/api/auth/get-session");
const currentUserId = session.value?.data?.user?.id;

// Local state for comments to handle additions and deletions
const comments = ref<Comment[]>([...props.initialComments]);

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
    comments.value.unshift(newComment);
    emits("comment-created", newComment);
    emits("comment-count-updated", {
        cardId: props.cardID,
        commentCount: comments.value.length,
    });
    // Emit socket event for comment count updates
    socket.emit("commentCountUpdated", {
        cardId: props.cardID,
        commentCount: comments.value.length,
    });
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
