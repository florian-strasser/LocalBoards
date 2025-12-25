<template>
    <div>
        <NewCommentForm
            :cardID="props.cardID"
            @Comment-created="handleCommentCreated"
        />
        <div v-if="comments.length > 0" class="mt-4 space-y-4">
            <div v-for="comment in comments" :key="comment.id">
                <div class="bg-slate p-6 rounded-xl">
                    <div class="wysiwyg-wrapper" v-html="comment.content" />
                </div>
                <p class="text-sm text-gray-500 mt-2">
                    {{ comment.userName }} | {{ formatDate(comment.date) }}
                </p>
            </div>
        </div>
        <div v-else class="mt-4 text-gray-500">No comments yet.</div>
    </div>
</template>

<script setup lang="ts">
const props = defineProps({
    cardID: Number,
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
