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

const isThisCard = (cardID) => props.cardID * 1 === cardID;

// (Re)join the card room on every (re)connect, but register the event
// listeners only once so they don't stack up across reconnects or repeated
// card-modal opens (which previously caused comment signals to be handled
// multiple times).
const joinCard = () => {
    if (props.cardID) {
        socket.emit("joinCard", {
            cardID: props.cardID,
        });
    }
};

const onAddComment = ({ comment, cardID }) => {
    if (isThisCard(cardID)) emits("comment-created", comment);
};

const onDeleteComment = ({ comment, cardID }) => {
    if (isThisCard(cardID)) emits("comment-deleted", comment);
};

const onUpdateComment = ({ comment, cardID }) => {
    if (isThisCard(cardID)) emits("comment-updated", comment);
};

socket.on("connect", joinCard);
socket.on("addComment", onAddComment);
socket.on("deleteComment", onDeleteComment);
socket.on("updateComment", onUpdateComment);

if (socket.connected) {
    joinCard();
}

onBeforeUnmount(() => {
    socket.off("connect", joinCard);
    socket.off("addComment", onAddComment);
    socket.off("deleteComment", onDeleteComment);
    socket.off("updateComment", onUpdateComment);
});
</script>
<template><div></div></template>
