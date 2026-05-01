<script setup>
import { socket } from "~/lib/socket";

const props = defineProps({
    cardID: Number,
    userID: String,
});

const emits = defineEmits([
    "comment-created",
    "comment-deleted",
    "comment-updated",
]);

const onConnect = () => {
    if (props.cardID) {
        socket.emit("joinCard", {
            cardID: props.cardID,
        });
    }
    socket.on("addComment", ({ comment, cardID }) => {
        if (props.cardID * 1 === cardID) emits("comment-created", comment);
    });
    socket.on("deleteComment", ({ comment, cardID }) => {
        if (props.cardID * 1 === cardID) emits("comment-deleted", comment);
    });
    socket.on("updateComment", ({ comment, cardID }) => {
        if (props.cardID * 1 === cardID) emits("comment-updated", comment);
    });
};

if (socket.connected) {
    onConnect();
}

socket.on("connect", onConnect);

onBeforeUnmount(() => {
    socket.off("connect", onConnect);
});
</script>
<template><div></div></template>
