<script setup>
import { socket } from "~/lib/socket";

const props = defineProps({
    boardID: String,
    userID: String,
});

const emits = defineEmits([
    "board-updated",
    "board-deleted",
    "areas-updated",
    "area-created",
    "area-updated",
    "area-deleted",
    ,
    "card-created",
    "card-updated",
    "card-moved",
    "card-orderd",
]);

const onConnect = () => {
    if (props.boardID) {
        socket.emit("joinBoard", {
            boardId: props.boardID,
        });
    }

    socket.on(
        "updateBoard",
        ({ boardID, boardName, boardStatus, boardStyle }) => {
            emits("board-updated", {
                boardID,
                boardName,
                boardStatus,
                boardStyle,
            });
        },
    );

    socket.on("deletedBoard", ({ boardID }) => {
        emits("board-deleted", boardID);
    });

    socket.on("updateAreas", ({ areas }) => {
        emits("areas-updated", areas);
    });

    socket.on("addCard", ({ card }) => {
        emits("card-created", card);
    });

    socket.on("updateCard", ({ card }) => {
        emits("card-updated", card);
    });

    socket.on("movedCard", ({ cardId, fromAreaId, toAreaId, newIndex }) => {
        emits("card-moved", { cardId, fromAreaId, toAreaId, newIndex });
    });

    socket.on("orderdCard", ({ cardId, areaId, newIndex }) => {
        emits("card-orderd", { cardId, areaId, newIndex });
    });

    socket.on("addArea", ({ area }) => {
        emits("area-created", area);
    });

    socket.on("updateArea", ({ area }) => {
        emits("area-updated", area);
    });

    socket.on("deleteArea", ({ area }) => {
        emits("area-deleted", area);
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
