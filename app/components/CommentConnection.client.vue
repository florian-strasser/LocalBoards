<script setup>
import { socket } from "~/lib/socket";

const props = defineProps({
    cardID: Number,
    userID: String,
});

const emits = defineEmits(["comment-created"]);

const onConnect = () => {
    if (props.cardID) {
        socket.emit("joinCard", {
            cardID: props.cardID,
        });
    }
    socket.on("addComment", ({ comment, cardID }) => {
        if (props.cardID * 1 === cardID) emits("comment-created", comment);
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
