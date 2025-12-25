<template>
    <div>
        <div v-if="!newCommentCreation" class="pt-1">
            <button
                @click="createNewComment"
                type="button"
                class="bg-primary hover:bg-secondary px-4 py-2 flex gap-x-1 items-center rounded-lg text-white"
            >
                <PlusIcon class="size-5" /><span>Write a comment</span>
            </button>
        </div>
        <form v-else @submit.prevent="createComment">
            <CardEditor v-model="newComment" />
            <div class="flex gap-x-1 mt-2">
                <input
                    type="submit"
                    class="bg-primary hover:bg-secondary px-4 py-2 rounded-lg text-white"
                    value="Create Comment"
                />
                <button
                    type="button"
                    @click="newCommentCreation = false"
                    class="px-4 bg-primary/10 text-primary hover:bg-secondary hover:text-white rounded-lg"
                >
                    <XMarkIcon class="size-5" />
                </button>
            </div>
        </form>
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";
import { PlusIcon, XMarkIcon } from "@heroicons/vue/24/outline";

interface Session {
    id: string;
    [key: string]: any;
}

interface Comment {
    id: number;
    card: number;
    user: string;
    content: string;
    date: string;
}

const props = defineProps({
    cardID: Number,
});

const emit = defineEmits(["Comment-created"]);

const newCommentCreation = ref(false);
const newComment = ref("");

const relativeFetch = ((url: string, opts?: any) => {
    try {
        if (url.startsWith("http")) url = new URL(url).pathname;
    } catch {}
    return useFetch(url, opts);
}) as any;

const { data: session } = await authClient.useSession(relativeFetch);

const userID = session.value.user.id;

const createNewComment = () => {
    newComment.value = "";
    newCommentCreation.value = true;
};

const createComment = async () => {
    try {
        const data = await $fetch<{ comment?: Comment }>("/api/data/comment", {
            method: "POST",
            body: {
                card: props.cardID,
                content: newComment.value,
                user: userID,
            },
        });
        if (data.comment) {
            newComment.value = "";
            newCommentCreation.value = false;
            emit("Comment-created", data.comment);
        }
    } catch (err) {
        console.error("Error creating Comment:", err);
    }
};
</script>
