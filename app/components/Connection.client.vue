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
    "card-deleted",
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
            if (props.boardID * 1 === boardID)
                emits("board-updated", {
                    boardID,
                    boardName,
                    boardStatus,
                    boardStyle,
                });
        },
    );

    socket.on("deletedBoard", ({ boardID }) => {
        if (props.boardID * 1 === boardID) emits("board-deleted", boardID);
    });

    socket.on("updateAreas", ({ areas, boardId }) => {
        if (props.boardID * 1 === boardId) emits("areas-updated", areas);
    });

    socket.on("addCard", ({ card, boardId }) => {
        if (props.boardID * 1 === boardId) emits("card-created", card);
    });

    socket.on("updateCard", ({ card, boardId }) => {
        if (props.boardID * 1 === boardId) emits("card-updated", card);
    });

    socket.on(
        "movedCard",
        ({ cardId, fromAreaId, toAreaId, newIndex, boardId }) => {
            if (props.boardID * 1 === boardId)
                emits("card-moved", { cardId, fromAreaId, toAreaId, newIndex });
        },
    );

    socket.on("deletedCard", ({ boardId, card }) => {
        if (props.boardID * 1 === boardId) emits("card-deleted", card);
    });

    socket.on("orderdCard", ({ cardId, areaId, newIndex, boardId }) => {
        if (props.boardID * 1 === boardId)
            emits("card-orderd", { cardId, areaId, newIndex });
    });

    socket.on("addArea", ({ area, boardId }) => {
        if (props.boardID * 1 === boardId) emits("area-created", area);
    });

    socket.on("updateArea", ({ area, boardId }) => {
        if (props.boardID * 1 === boardId) emits("area-updated", area);
    });

    socket.on("deleteArea", ({ area, boardId }) => {
        if (props.boardID * 1 === boardId) emits("area-deleted", area);
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
