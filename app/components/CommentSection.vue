<template>
    <div v-if="props.writeAccess || comments.length > 0">
        <h3 class="text-xl font-bold text-primary">Comments and activity</h3>
        <NewCommentForm
            :cardID="props.cardID"
            @Comment-created="handleCommentCreated"
        />
        <CommentConnection
            :cardID="props.cardID"
            @comment-created="handleCommentCreated"
        />
        <div v-if="comments.length > 0" class="mt-4 space-y-4">
            <div v-for="comment in comments" :key="comment.id">
                <div class="bg-primary/10 p-6 rounded-xl">
                    <div class="wysiwyg-wrapper" v-html="comment.content" />
                </div>
                <div class="flex mt-2 items-center gap-x-2">
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
                        {{ comment.userName }} | {{ formatDate(comment.date) }}
                    </p>
                </div>
            </div>
        </div>
        <div v-else class="mt-4 text-gray-500">No comments yet.</div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps({
    cardID: Number,
    writeAccess: Boolean,
});

interface Comment {
    id: number;
    card: number;
    user: string;
    userName: string;
    content: string;
    date: string;
}

const comments = ref<Comment[]>([]);

// Fetch comments for the card
const fetchComments = async () => {
    try {
        const response = await $fetch<{ comments: Comment[] }>(
            `/api/data/comment/?cardID=${props.cardID}`,
            {
                method: "GET",
            },
        );
        comments.value = response.comments || [];
    } catch (err) {
        console.error("Error fetching comments:", err);
    }
};

// Handle the creation of a new comment
const handleCommentCreated = (newComment: Comment) => {
    comments.value.unshift(newComment);
};

// Format the date for display
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
};

// Fetch comments when the component is mounted
onMounted(() => {
    fetchComments();
});
</script>
