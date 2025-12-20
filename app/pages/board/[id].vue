<template>
    <div class="min-h-screen flex flex-col justify-between">
        <AppHeader />
        <div class="w-full pt-12 pb-7 grow-0 shrink-0">
            <div class="container">
                <div v-if="accessError" class="text-red-500 text-center">
                    {{ accessError }}
                </div>
                <div v-else class="flex justify-between">
                    <h1 class="text-5xl text-primary transform -translate-y-1">
                        {{ boardName }}
                    </h1>

                    <div class="flex gap-x-4 items-center">
                        <button
                            @click="openModal"
                            class="size-12 bg-primary text-white hover:bg-secondary flex justify-center items-center rounded-full"
                        >
                            <Cog6ToothIcon class="size-6" />
                        </button>
                        <button
                            v-if="boardID !== 'new'"
                            @click="deleteModal = true"
                            class="size-12 bg-primary text-white hover:bg-secondary flex justify-center items-center rounded-full"
                        >
                            <TrashIcon class="size-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="w-full grow shrink-0 pb-12 overflow-scroll hide-scrollbar">
            <div class="container">
                <div
                    v-if="boardID !== 'new'"
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
                        class="bg-white p-4 rounded-lg"
                        :class="{
                            'max-w-full w-92 shrink-0 grow-0':
                                boardStyle == 'kanban',
                            'w-full': boardStyle == 'todo',
                        }"
                    >
                        <div class="flex justify-between items-center mb-2">
                            <input
                                v-model="area.name"
                                @blur="updateAreaName(area)"
                                class="font-bold bg-transparent text-primary focus:outline-none shrink grow"
                            />
                            <button
                                @click="deleteAreaModal = area.id"
                                class="text-primary hover:text-secondary shrink-0 grow-0"
                            >
                                <TrashIcon class="size-5" />
                            </button>
                        </div>
                        <div
                            v-if="cards[area.id]"
                            :data-area-id="area.id"
                            class="mb-1 space-y-1 card-wrapper"
                        >
                            <button
                                v-for="card in cards[area.id]"
                                :key="card.id"
                                :data-card-id="card.id"
                                type="button"
                                class="bg-primary/10 text-primary text-left p-2 rounded-md w-full"
                                @click="cardModal = card.id"
                            >
                                <h3 class="font-bold">{{ card.name }}</h3>
                                <p>
                                    Status:
                                    {{ card.status ? "Completed" : "Pending" }}
                                </p>
                            </button>
                        </div>
                        <NewCardForm
                            :boardID="boardID * 1"
                            :areaID="area.id"
                            @card-created="handleCardCreated"
                        />
                    </div>
                    <div
                        v-if="boardID !== 'new'"
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
                            <PlusIcon class="size-5" /><span
                                >Create New Area</span
                            >
                        </button>
                        <form
                            v-else
                            @submit.prevent="createArea"
                            class="bg-white p-4 rounded-lg"
                        >
                            <input
                                v-model="newAreaName"
                                ref="newAreaInput"
                                placeholder="Enter an area name"
                                class="font-bold bg-transparent text-primary focus:outline-none w-full"
                            />
                            <div class="flex gap-x-1 mt-2">
                                <input
                                    type="submit"
                                    class="bg-primary hover:bg-secondary px-4 py-2 rounded-lg text-white"
                                    value="Create area"
                                />
                                <button
                                    type="button"
                                    @click="newAreaCreation = false"
                                    class="px-4 bg-primary/10 text-primary hover:bg-secondary hover:text-white rounded-lg"
                                >
                                    <XMarkIcon class="size-5" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
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
        <ModalWindow v-model="deleteModal">
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
        <ModalWindow v-model="deleteAreaModal">
            <h2 class="text-4xl text-primary mb-3">
                Do you want to delete this area?
            </h2>
            <p class="mb-6">Every card will be deleted too.</p>
            <button
                @click="deleteArea(deleteAreaModal)"
                type="button"
                class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
            >
                Delete Area
            </button>
        </ModalWindow>
        <ModalWindow v-model="cardModal">
            <CardModal
                :cardID="cardModal"
                v-if="cardModal"
                @card-updated="handleCardUpdated"
            />
        </ModalWindow>
        <AppFooter />
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";
import Sortable from "sortablejs";
import {
    Cog6ToothIcon,
    XMarkIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/vue/24/outline";

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
const boardStyle = ref("kanban");
const boardStatus = ref("private");

const newBoardName = ref(boardName.value);
const newBoardStyle = ref(boardStyle.value);
const newBoardStatus = ref(boardStatus.value);

const accessError = ref("");
const optionsActive = ref(false);

const deleteModal = ref(false);
const deleteAreaModal = ref(false);

const areasWrapper = ref(null);
const areas = ref([]);
const cards = ref({});

const cardModal = ref(false);

const newAreaName = ref("");
const newAreaCreation = ref(false);
const newAreaInput = ref(null);

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
    // console.log(updatedCard);
    const cardIndex = cards.value[updatedCard.area].findIndex(
        (card) => card.id === updatedCard.id,
    );
    console.log(cards.value[updatedCard.area][cardIndex]);

    if (cardIndex !== -1) {
        // Update the card in the `cards` array
        cards.value[updatedCard.area][cardIndex] = updatedCard;
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
            // Fetch cards for the new area
            await fetchCardsForArea(data.area.id);
            await nextTick(); // Wait for the DOM to update
            initSort();
            // Should enable sorting for cards within the area at this point
            await nuxtApp.callHook("app:toast", {
                message: "Area created",
            });
        }
    } catch (err) {
        console.error("Error creating area:", err);
    }
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

// Load cards for all areas when the board is loaded
if (boardID.value !== "new") {
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
    } catch (err) {
        console.error("Error updating area:", err);
    }
};

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
        await nuxtApp.callHook("app:toast", {
            message: "Area deleted",
        });
    } catch (err) {
        console.error("Error deleting area:", err);
    }
};

// Load areas when the board is loaded
if (boardID.value !== "new") {
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
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

const openModal = () => {
    newBoardName.value = boardName.value;
    newBoardStyle.value = boardStyle.value;
    newBoardStatus.value = boardStatus.value;
    optionsActive.value = true;
};

if (boardID.value === "new") {
} else {
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
        } else if (data.value?.board) {
            boardName.value = data.value.board.name;
            boardStyle.value = data.value.board.style || "kanban";
            boardStatus.value = data.value.board.status || "private";
            newBoardName.value = boardName.value;
            newBoardStyle.value = boardStyle.value;
            newBoardStatus.value = boardStatus.value;
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

// Save board name with debounce
const saveBoard = async () => {
    const newName = newBoardName.value.trim();
    if (!newName) return;

    try {
        const data = await $fetch("/api/data/board", {
            method: "POST",
            body: {
                id: boardID.value === "new" ? null : boardID.value,
                userId: userID,
                name: newName,
                style: newBoardStyle.value,
                status: newBoardStatus.value,
            },
        });
        if (!data) {
            console.error("Error updating board");
        } else {
            // If creating a new board, update the route with the new ID
            if (boardID.value === "new" && data.board?.id) {
                // Update the URL virtually without redirecting
                boardID.value = data.board.id;
                initSort();
                history.replaceState(null, "", `/board/${data.board.id}`);
            }
            boardName.value = newBoardName.value;
            boardStyle.value = newBoardStyle.value;
            boardStatus.value = newBoardStatus.value;
            optionsActive.value = false;
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
            await navigateTo("/dashboard/");
        }
    } catch (err) {
        console.error("Error:", err);
    }
};

const initSort = () => {
    if (areasWrapper.value) {
        Array.from(areasWrapper.value.children).forEach((child) => {
            console.log(child);
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
                    const movedItem = updatedAreas.splice(event.oldIndex, 1)[0];
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
                    } catch (error) {
                        console.error("Error updating area order:", error);
                        // Optionally revert the local change if the API call fails
                        areas.value = [...updatedAreas];
                    }
                }
            },
        });
    }
};

onMounted(() => {
    initSort();
});
</script>
