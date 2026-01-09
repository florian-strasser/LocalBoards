<template>
    <div class="min-h-screen flex flex-col justify-between">
        <AppHeader />
        <div class="w-full pt-12 pb-7 grow-0 shrink-0">
            <div class="container">
                <div
                    v-if="accessError"
                    class="bg-secondary text-white text-center py-3 px-6 rounded-lg"
                >
                    {{ accessError }}
                </div>
                <div v-else class="flex justify-between">
                    <h1 class="text-5xl text-primary transform -translate-y-1">
                        {{ boardName }}
                    </h1>

                    <div
                        v-if="userID === boardUser"
                        class="flex gap-x-4 items-center"
                    >
                        <button
                            @click="openModal"
                            class="size-12 bg-primary text-white hover:bg-secondary flex justify-center items-center rounded-full"
                            v-tooltip="'Board settings'"
                        >
                            <Pencil class="size-5" />
                        </button>
                        <button
                            @click="inviteModal = true"
                            class="size-12 bg-primary text-white hover:bg-secondary flex justify-center items-center rounded-full"
                            v-tooltip="'Invite users'"
                        >
                            <UserRoundPlus class="size-5" />
                        </button>
                        <button
                            @click="deleteModal = true"
                            class="size-12 bg-primary text-white hover:bg-secondary flex justify-center items-center rounded-full"
                            v-tooltip="'Delete board'"
                        >
                            <Trash2 class="size-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="w-full grow shrink-0 pb-5 overflow-scroll hide-scrollbar">
            <div class="container">
                <div
                    v-if="!accessError"
                    ref="areasWrapper"
                    class="mt-4"
                    :class="{
                        'flex items-start gap-x-5': boardStyle == 'kanban',
                        'space-y-5': boardStyle == 'todo',
                    }"
                >
                    <div
                        v-for="area in areas"
                        :key="area.id"
                        class="bg-white p-4 space-y-2 rounded-lg"
                        :class="{
                            'max-w-full w-92 shrink-0 grow-0':
                                boardStyle == 'kanban',
                            'w-full': boardStyle == 'todo',
                        }"
                    >
                        <div class="flex justify-between items-center">
                            <input
                                v-model="area.name"
                                @blur="updateAreaName(area)"
                                :disabled="!writeAccess"
                                class="font-bold bg-transparent text-primary focus:outline-none shrink grow"
                            />
                            <button
                                v-if="writeAccess"
                                @click="deleteAreaModal = area.id"
                                class="text-primary hover:text-secondary shrink-0 grow-0"
                                v-tooltip="$t('delete')"
                            >
                                <Trash2 class="size-5" />
                            </button>
                        </div>
                        <div
                            v-if="cards[area.id]"
                            :data-area-id="area.id"
                            class="space-y-1 card-wrapper"
                        >
                            <CardTile
                                v-for="card in cards[area.id]"
                                :card="card"
                                v-model="cardModal"
                            />
                        </div>
                        <NewCardForm
                            v-if="writeAccess"
                            :boardID="boardID * 1"
                            :areaID="area.id"
                            :userID="userID"
                            @card-created="handleCardCreated"
                        />
                    </div>
                    <div
                        v-if="writeAccess"
                        :class="{
                            'max-w-full w-92 shrink-0 grow-0':
                                boardStyle == 'kanban',
                            'w-full': boardStyle == 'todo',
                        }"
                    >
                        <button
                            v-if="!newAreaCreation"
                            @click="createNewArea"
                            class="bg-white text-primary hover:bg-secondary hover:text-white p-4 rounded-lg flex w-full items-center gap-x-1"
                        >
                            <PlusIcon class="size-5" /><span>{{
                                $t("createNewArea")
                            }}</span>
                        </button>
                        <form
                            v-else
                            @submit.prevent="createArea"
                            class="bg-white p-4 rounded-lg"
                        >
                            <input
                                v-model="newAreaName"
                                ref="newAreaInput"
                                :placeholder="$t('enterAnAreaName')"
                                class="font-bold bg-transparent text-primary focus:outline-none w-full"
                            />
                            <div class="flex gap-x-1 mt-2">
                                <input
                                    type="submit"
                                    class="bg-primary hover:bg-secondary px-4 py-2 rounded-lg text-white"
                                    :value="$t('createArea')"
                                />
                                <button
                                    type="button"
                                    @click="newAreaCreation = false"
                                    class="px-4 bg-primary/10 text-primary hover:bg-secondary hover:text-white rounded-lg"
                                >
                                    <X class="size-5" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        <div class="container pb-12 grow-0 shrink-0">
            <Connection
                :userID="userID"
                :boardID="boardID"
                @board-updated="handleBoardUpdated"
                @board-deleted="handleBoardDeleted"
                @areas-updated="handleAreasUpdated"
                @card-created="handleCardCreated"
                @card-updated="handleCardUpdated"
                @card-moved="handleCardMoved"
                @card-orderd="handleCardOrderd"
                @area-created="handleNewArea"
                @area-updated="handleAreaUpdated"
                @area-deleted="handleDeleteArea"
            />
        </div>
        <ModalWindow v-model="optionsActive">
            <div>
                <form @submit.prevent="saveBoard" class="text-left space-y-5">
                    <div>
                        <InputField
                            type="text"
                            name="boardName"
                            label="Board Name"
                            required
                            v-model="newBoardName"
                        />
                    </div>
                    <div>
                        <label class="block text-sm/6 font-medium text-gray"
                            >Style</label
                        >
                        <RadioList
                            :values="['kanban', 'todo']"
                            name="style"
                            v-model="newBoardStyle"
                        />
                    </div>
                    <div>
                        <label class="block text-sm/6 font-medium text-gray"
                            >Status</label
                        >
                        <RadioList
                            :values="['private', 'public']"
                            name="status"
                            v-model="newBoardStatus"
                        />
                    </div>
                    <input
                        type="submit"
                        class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                        value="Save Board"
                    />
                </form>
            </div>
        </ModalWindow>
        <ModalWindow v-if="userID === boardUser" v-model="deleteModal">
            <h2 class="text-4xl text-primary mb-3">
                Do you want to delete this board?
            </h2>
            <p class="mb-6">Every card will be deleted too.</p>
            <button
                @click="deleteBoard"
                type="button"
                class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
            >
                Delete Board
            </button>
        </ModalWindow>
        <ModalWindow v-if="userID === boardUser" v-model="inviteModal">
            <InviteModal :boardID="boardID" />
        </ModalWindow>
        <ModalWindow v-model="deleteAreaModal">
            <h2 class="text-4xl text-primary mb-3">
                {{ $t("deleteAreaHeadline") }}
            </h2>
            <p class="mb-6">{{ $t("deleteAreaText") }}</p>
            <button
                @click="deleteArea(deleteAreaModal)"
                type="button"
                class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
            >
                {{ $t("deleteAreaButton") }}
            </button>
        </ModalWindow>
        <ModalWindow v-model="cardModal">
            <CardModal
                :cardID="cardModal"
                :boardID="boardID * 1"
                :writeAccess="writeAccess"
                v-if="cardModal"
                @card-updated="handleCardUpdated"
            />
        </ModalWindow>
        <AppFooter />
    </div>
</template>
<script setup lang="ts">
import { socket } from "~/lib/socket";
import { authClient } from "@/lib/auth-client";
import Sortable from "sortablejs";
import { Pencil, UserRoundPlus, Trash2, X } from "lucide-vue-next";
import { PlusIcon } from "@heroicons/vue/24/outline";

const nuxtApp = useNuxtApp();

const relativeFetch = ((url: string, opts?: any) => {
    try {
        if (url.startsWith("http")) url = new URL(url).pathname;
    } catch {}
    return useFetch(url, opts);
}) as any;

const { data: session } = await authClient.useSession(relativeFetch);

const userID = session.value.user.id;

const route = useRoute();
const boardID = ref(route.params.id);

const boardName = ref("Untitled Board");
const boardUser = ref(false);
const boardStyle = ref("kanban");
const boardStatus = ref("private");

const newBoardName = ref(boardName.value);
const newBoardStyle = ref(boardStyle.value);
const newBoardStatus = ref(boardStatus.value);

const accessError = ref("");
const optionsActive = ref(false);

const deleteModal = ref(false);
const deleteAreaModal = ref(false);
const inviteModal = ref(false);

const areasWrapper = ref(null);
const areas = ref([]);
const cards = ref({});

const cardModal = ref(false);

const newAreaName = ref("");
const newAreaCreation = ref(false);
const newAreaInput = ref(null);

const writeAccess = ref(false);

const createNewArea = async () => {
    newAreaName.value = "";
    newAreaCreation.value = true;
    nextTick(() => {
        if (newAreaInput.value) {
            newAreaInput.value.focus();
        }
    });
};

const handleCardUpdated = (updatedCard) => {
    const cardIndex = cards.value[updatedCard.area].findIndex(
        (card) => card.id === updatedCard.id,
    );
    if (cardIndex !== -1) {
        // Update the card in the `cards` array
        cards.value[updatedCard.area][cardIndex] = updatedCard;
    }
};

const handleCardMoved = (movedCard) => {
    const cardId = movedCard.cardId;
    const fromArray = movedCard.fromAreaId;
    const toArray = movedCard.toAreaId;
    const newIndex = movedCard.newIndex;
    const currentIndex = cards.value[fromArray].findIndex(
        (item) => item.id === cardId * 1,
    );
    if (currentIndex === -1) {
        console.error("Item not found in the array.");
    } else {
        const [itemToMove] = cards.value[fromArray].splice(currentIndex, 1);
        cards.value[toArray].splice(newIndex, 0, itemToMove);
    }
};

const handleCardOrderd = (orderdCard) => {
    const newIndex = orderdCard.newIndex;
    const currentIndex = cards.value[orderdCard.areaId].findIndex(
        (item) => item.id === orderdCard.cardId * 1,
    );
    if (currentIndex === -1) {
        console.error("Item not found in the array.");
    } else {
        const [itemToMove] = cards.value[orderdCard.areaId].splice(
            currentIndex,
            1,
        );
        cards.value[orderdCard.areaId].splice(newIndex, 0, itemToMove);
    }
};

const createArea = async () => {
    try {
        const data = await $fetch("/api/data/area", {
            method: "POST",
            body: {
                boardId: boardID.value,
                name: newAreaName.value,
            },
        });
        if (data.area) {
            newAreaName.value = "";
            nextTick(() => {
                if (newAreaInput.value) {
                    newAreaInput.value.focus();
                }
            });
            areas.value.push(data.area);

            socket.emit("areaCreated", {
                boardId: boardID.value,
                area: data.area,
            });
            await fetchCardsForArea(data.area.id);
            await nextTick(); // Wait for the DOM to update
            initSort();
            // Should enable sorting for cards within the area at this point
            await nuxtApp.callHook("app:toast", {
                message: $t("areaCreated"),
            });
        }
    } catch (err) {
        console.error("Error creating area:", err);
    }
};

const handleNewArea = async (area) => {
    areas.value.push(area);
    await nextTick(); // Wait for the DOM to update
    initSort();
};

const handleAreaUpdated = async (area) => {
    areas.value[areas.value.findIndex((item) => item.id === area.id)].name =
        area.name;
};

const handleDeleteArea = async (areaId) => {
    // Find the area with the matching ID
    const areaToDelete = areas.value.find((area) => area.id === areaId);

    if (areaToDelete) {
        areas.value = areas.value.filter((area) => area.id !== areaId);
    } else {
        console.error("Area not found with ID:", areaId);
    }
    //areas.value.push(area);
    await nextTick(); // Wait for the DOM to update
    // initSort();
};

// Fetch cards for a specific area
const fetchCardsForArea = async (areaId) => {
    try {
        const { data, error } = await useFetch(
            `/api/data/cards?areaId=${areaId}`,
            {
                method: "GET",
            },
        );

        if (error.value) {
            console.error("Error fetching cards:", error.value);
        } else if (data.value?.cards) {
            if (!cards.value[areaId]) {
                cards.value[areaId] = [];
            }
            // Ensure each card has a status field
            data.value.cards.forEach((card) => {
                if (typeof card.status === "undefined") {
                    card.status = false;
                }
            });
            cards.value[areaId] = data.value.cards;
        }
    } catch (err) {
        console.error("Error:", err);
    }
};

const updateAreaName = async (area) => {
    try {
        await $fetch("/api/data/area", {
            method: "POST",
            body: {
                id: area.id,
                boardId: boardID.value,
                name: area.name,
            },
        });
        socket.emit("areaUpdated", {
            boardId: boardID.value,
            area: area,
        });
    } catch (err) {
        console.error("Error updating area:", err);
    }
};
// Delete Area
const deleteArea = async (areaId) => {
    try {
        await $fetch(`/api/data/area?id=${areaId}&boardId=${boardID.value}`, {
            method: "DELETE",
        });

        // Remove the area from the local list
        areas.value = areas.value.filter((area) => area.id !== areaId);
        // Remove the cards for the area
        delete cards.value[areaId];
        deleteAreaModal.value = false;

        socket.emit("areaDeleted", {
            boardId: boardID.value,
            area: areaId,
        });

        await nuxtApp.callHook("app:toast", {
            message: $t("areaDeleted"),
        });
    } catch (err) {
        console.error("Error deleting area:", err);
    }
};

const openModal = () => {
    newBoardName.value = boardName.value;
    newBoardStyle.value = boardStyle.value;
    newBoardStatus.value = boardStatus.value;
    optionsActive.value = true;
};

// Save board name with debounce
const saveBoard = async () => {
    const newName = newBoardName.value.trim();
    if (!newName) return;

    try {
        const data = await $fetch("/api/data/board", {
            method: "POST",
            body: {
                id: boardID.value ? boardID.value : null,
                userId: userID,
                name: newName,
                style: newBoardStyle.value,
                status: newBoardStatus.value,
            },
        });
        if (!data) {
            console.error("Error updating board");
        } else {
            boardName.value = newBoardName.value;
            boardStyle.value = newBoardStyle.value;
            boardStatus.value = newBoardStatus.value;
            optionsActive.value = false;

            socket.emit("boardUpdated", {
                boardID: boardID.value,
                boardName: boardName.value,
                boardStyle: boardStyle.value,
                boardStatus: boardStatus.value,
            });

            await nuxtApp.callHook("app:toast", {
                message: "Board saved",
            });
        }
    } catch (err) {
        console.error("Error:", err);
    }
};

const handleCardCreated = (card) => {
    if (!cards.value[card.area]) {
        cards.value[card.area] = [];
    }
    // Ensure the card has a status field
    if (typeof card.status === "undefined") {
        card.status = false;
    }
    cards.value[card.area].push(card);
};

const handleBoardUpdated = (board) => {
    boardName.value = board.boardName;
    boardStyle.value = board.boardStyle;
    boardStatus.value = board.boardStatus;
};

const handleAreasUpdated = (updatedAreas) => {
    areas.value = updatedAreas;
};

const handleBoardDeleted = async () => {
    cards.value = {};
    await nuxtApp.callHook("app:toast", {
        message: "Board has been deleted",
    });
    await navigateTo("/dashboard/");
};

const deleteBoard = async () => {
    try {
        const data = await $fetch(
            `/api/data/board?id=${boardID.value}&userId=${userID}`,
            {
                method: "DELETE",
            },
        );

        if (!data) {
            console.error("Error deleting board");
        } else {
            await nuxtApp.callHook("app:toast", {
                message: "Board deleted",
            });
            // Remove all cards when the board is deleted
            cards.value = {};
            socket.emit("boardDeleted", {
                boardID: boardID.value,
            });
            await navigateTo("/dashboard/");
        }
    } catch (err) {
        console.error("Error:", err);
    }
};

const initSort = () => {
    if (areasWrapper.value) {
        Array.from(areasWrapper.value.children).forEach((child) => {
            const el = child.querySelector(".card-wrapper");
            if (el) {
                const sortChild = Sortable.create(el, {
                    group: "cards",
                    onEnd: async (event) => {
                        if (event.from !== event.to) {
                            // Card moved to a different area
                            const cardId = event.item.dataset.cardId;
                            const fromAreaId = event.from.dataset.areaId;
                            const toAreaId = event.to.dataset.areaId;

                            try {
                                await $fetch("/api/data/cardMove", {
                                    method: "POST",
                                    body: {
                                        cardId,
                                        fromAreaId,
                                        toAreaId,
                                        newIndex: event.newIndex,
                                    },
                                });

                                socket.emit("cardMoved", {
                                    boardId: boardID.value,
                                    cardId,
                                    fromAreaId,
                                    toAreaId,
                                    newIndex: event.newIndex,
                                });
                            } catch (error) {
                                console.error("Error moving card:", error);
                            }
                        } else {
                            // Card moved within the same area
                            const cardId = event.item.dataset.cardId;
                            const areaId = event.from.dataset.areaId;

                            try {
                                await $fetch("/api/data/cardOrder", {
                                    method: "POST",
                                    body: {
                                        cardId,
                                        areaId,
                                        newIndex: event.newIndex,
                                    },
                                });

                                socket.emit("cardOrderd", {
                                    boardId: boardID.value,
                                    cardId,
                                    areaId,
                                    newIndex: event.newIndex,
                                });
                            } catch (error) {
                                console.error(
                                    "Error updating card order:",
                                    error,
                                );
                            }
                        }
                    },
                });
            }
        });
        if (writeAccess.value) {
            const sortable = Sortable.create(areasWrapper.value, {
                group: "areas",
                onEnd: async (event) => {
                    if (
                        event.oldIndex !== undefined &&
                        event.newIndex !== undefined
                    ) {
                        // Get the updated areas array with new order
                        const updatedAreas = [...areas.value];
                        // Remove the moved item
                        const movedItem = updatedAreas.splice(
                            event.oldIndex,
                            1,
                        )[0];
                        // Add the moved item at the new position
                        updatedAreas.splice(event.newIndex, 0, movedItem);
                        console.log("should update");
                        try {
                            // Call the API to update the order
                            await $fetch("/api/data/board", {
                                method: "PATCH",
                                body: {
                                    boardId: boardID.value,
                                    areas: updatedAreas,
                                },
                            });
                            // Update the local areas array
                            areas.value = updatedAreas;
                            socket.emit("areasUpdated", {
                                boardId: boardID.value,
                                areas: updatedAreas,
                            });
                        } catch (error) {
                            console.error("Error updating area order:", error);
                            // Optionally revert the local change if the API call fails
                            areas.value = [...updatedAreas];
                        }
                    }
                },
            });
        }
    }
};
// Fetch board
try {
    const { data, error } = await useFetch(
        `/api/data/board?id=${boardID.value}&userId=${userID}`,
        {
            method: "GET",
        },
    );

    if (error.value) {
        console.error("Error fetching board:", error.value);
        if (error.value.statusCode === 403) {
            accessError.value = "You don't have access to this board";
        }
        if (error.value.statusCode === 404) {
            accessError.value = "This board does not exist";
        }
    } else if (data.value?.board) {
        boardName.value = data.value.board.name;
        boardUser.value = data.value.board.user;
        boardStyle.value = data.value.board.style || "kanban";
        boardStatus.value = data.value.board.status || "private";
        newBoardName.value = boardName.value;
        newBoardStyle.value = boardStyle.value;
        newBoardStatus.value = boardStatus.value;
        writeAccess.value = data.value.writeAccess;
    }
} catch (err) {
    console.error("Error:", err);
}
// Load cards for all areas when the board is loaded
if (!accessError.value) {
    try {
        const { data, error } = await useFetch(
            `/api/data/areas?boardId=${boardID.value}`,
            {
                method: "GET",
            },
        );

        if (error.value) {
            console.error("Error fetching areas:", error.value);
        } else if (data.value?.areas) {
            areas.value = data.value.areas;
            // Fetch cards for each area
            for (const area of areas.value) {
                await fetchCardsForArea(area.id);
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}
onMounted(() => {
    initSort();
});
</script>
