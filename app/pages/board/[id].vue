<template>
    <div class="min-h-svh flex flex-col justify-between">
        <AppHeader />
        <div class="w-full pt-12 pb-7 grow-0 shrink-0">
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
                @card-deleted="handleCardDeleted"
                @area-created="handleNewArea"
                @area-updated="handleAreaUpdated"
                @area-deleted="handleDeleteArea"
                @comment-count-updated="handleCommentCountUpdated"
                @presence-updated="handlePresenceUpdated"
            />
            <div class="container">
                <div
                    v-if="accessError"
                    class="bg-secondary text-white text-center py-3 px-6 rounded-lg"
                >
                    {{ accessError }}
                </div>
                <!-- Title and menu share one row: wrapping the menu onto its
                     own line cost a whole band of vertical space on a phone.
                     min-w-0 lets a long board name wrap inside its column
                     instead of pushing the menu away. -->
                <div v-else class="flex justify-between items-start gap-4">
                    <h1
                        class="min-w-0 text-3xl sm:text-5xl text-dark dark:text-white"
                    >
                        {{ boardName }}
                    </h1>
                    <!-- One menu instead of a row of icon buttons: it keeps the
                         header compact on small screens and new actions cost a
                         list entry rather than another icon to tell apart.
                         The owner manages the board; everyone else can only
                         show themselves out (a board needs its owner, so there
                         is no "leave" for them — they delete it instead). -->
                    <!-- The wrapper carries the one-line height that aligns
                         the button with the title's first line. ActionMenu's own
                         root must stay a plain block: its dropdown sets no `top`
                         and relies on its static position to sit below. -->
                    <div
                        v-if="!accessError"
                        class="flex h-9 shrink-0 items-center sm:h-12"
                    >
                    <ActionMenu
                        :tooltip="$t('moreOptions')"
                        :data-onboarding="
                            userID === boardUser ? 'invite' : undefined
                        "
                    >
                        <template v-if="userID === boardUser">
                            <button
                                type="button"
                                @click="openModal"
                                :class="menuItemClass"
                            >
                                <Pencil class="size-4 shrink-0" />
                                {{ $t("boardSettings") }}
                            </button>
                            <button
                                type="button"
                                @click="openInviteModal"
                                :class="menuItemClass"
                            >
                                <UserRoundPlus class="size-4 shrink-0" />
                                {{ $t("inviteUsers") }}
                            </button>
                            <button
                                type="button"
                                @click="openDeleteBoard"
                                :class="menuItemDestructiveClass"
                            >
                                <Trash2 class="size-4 shrink-0" />
                                {{ $t("deleteBoard") }}
                            </button>
                        </template>
                        <button
                            v-else
                            type="button"
                            @click="openLeaveBoard"
                            :class="menuItemDestructiveClass"
                        >
                            <Ban class="size-4 shrink-0" />
                            {{ $t("leaveBoard") }}
                        </button>
                    </ActionMenu>
                    </div>
                </div>
            </div>
        </div>
        <div
            class="@container w-full grow min-h-0 pb-10 overflow-x-auto overflow-y-hidden bg-slate dark:bg-dark"
            :style="anyModalOpen ? { overflowX: 'hidden' } : undefined"
        >
            <!-- The horizontal padding lives on the areas wrapper itself (not a
                 wrapping .container) and, for kanban, the wrapper is sized to
                 w-max so its right padding is part of the scroll width. That
                 keeps a 2rem gutter on both ends — at maximum scroll the last
                 area lines up with the header's right edge instead of running to
                 the viewport edge (Safari otherwise drops a flex container's
                 padding-right on overflow). -->
            <div
                v-if="!accessError"
                ref="areasWrapper"
                data-onboarding="areas"
                class="mt-4 px-8"
                :class="{
                    'flex w-max items-start gap-x-5': boardStyle === 'kanban',
                    'space-y-5': boardStyle === 'todo',
                }"
            >
                    <div
                        v-for="(area, areaIndex) in areas"
                        :key="area.id"
                        class="p-4 space-y-2 rounded-lg bg-white dark:bg-slate"
                        :class="{
                            'w-92 max-w-[calc(100cqw-4rem)] shrink-0 grow-0':
                                boardStyle == 'kanban',
                            'w-full': boardStyle == 'todo',
                        }"
                    >
                        <div class="flex justify-between items-center">
                            <input
                                v-model="area.name"
                                @blur="updateAreaName(area)"
                                :disabled="!writeAccess"
                                class="font-bold bg-transparent text-dark dark:text-white focus:outline-none shrink grow"
                            />
                            <button
                                v-if="writeAccess"
                                @click="openDeleteAreaModal(area.id)"
                                class="text-primary hover:text-primary-hover shrink-0 grow-0"
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
                                :has-unread="unreadCardIds.has(card.id)"
                                :viewers="viewersFor(card.id)"
                                v-model="cardModal"
                            />
                        </div>
                        <NewCardForm
                            v-if="writeAccess"
                            :data-onboarding="
                                areaIndex === 0 ? 'new-card' : undefined
                            "
                            :boardID="boardID * 1"
                            :areaID="area.id"
                            :userID="userID"
                            @card-created="handleLocalCardCreated"
                        />
                    </div>
                    <div
                        v-if="writeAccess"
                        :class="{
                            // Always a column's width, open or not: sizing it
                            // to its content while idle made the whole board jump
                            // sideways the moment the form appeared.
                            'w-92 max-w-[calc(100cqw-4rem)] shrink-0 grow-0':
                                boardStyle == 'kanban',
                            'w-full': boardStyle == 'todo',
                        }"
                    >
                        <button
                            v-if="!newAreaCreation"
                            @click="createNewArea"
                            data-onboarding="new-area"
                            class="bg-white dark:bg-slate text-dark dark:text-white hover:bg-primary-hover hover:text-white p-4 rounded-lg flex w-full items-center gap-x-1"
                        >
                            <Plus :stroke-width="1.5" class="size-5" /><span>{{
                                $t("createNewArea")
                            }}</span>
                        </button>
                        <form
                            v-else
                            @submit.prevent="createArea"
                            class="bg-white dark:bg-slate p-4 rounded-lg"
                        >
                            <input
                                v-model="newAreaName"
                                ref="newAreaInput"
                                :placeholder="$t('enterAnAreaName')"
                                class="font-bold bg-transparent text-dark dark:text-white focus:outline-none w-full"
                            />
                            <div class="flex gap-x-1 mt-2">
                                <input
                                    type="submit"
                                    class="bg-primary hover:bg-primary-hover px-4 py-2 rounded-lg text-white"
                                    :value="$t('createArea')"
                                />
                                <button
                                    type="button"
                                    @click="newAreaCreation = false"
                                    class="px-4 bg-primary/10 dark:bg-white/10 text-primary dark:text-white hover:bg-primary-hover hover:text-white rounded-lg"
                                >
                                    <X class="size-5" />
                                </button>
                            </div>
                        </form>
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
                            :label="$t('boardName')"
                            required
                            v-model="newBoardName"
                        />
                    </div>
                    <div>
                        <InputImage
                            :label="$t('boardThumbnail')"
                            :images="[
                                '/images/board_placeholder_01.png',
                                '/images/board_placeholder_02.png',
                                '/images/board_placeholder_03.png',
                                '/images/board_placeholder_04.png',
                                '/images/board_placeholder_05.png',
                                '/images/board_placeholder_06.png',
                                '/images/board_placeholder_07.png',
                                '/images/board_placeholder_08.png',
                            ]"
                            v-model="newBoardImage"
                        />
                    </div>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                class="mb-1 block text-sm/6 font-medium text-gray"
                                >{{ $t("boardStyle") }}</label
                            >
                            <SegmentedControl
                                :values="[
                                    { value: 'kanban', label: $t('kanBan') },
                                    { value: 'todo', label: $t('toDo') },
                                ]"
                                name="style"
                                v-model="newBoardStyle"
                            />
                        </div>
                        <div>
                            <label
                                class="mb-1 block text-sm/6 font-medium text-gray"
                                >{{ $t("boardStatus") }}</label
                            >
                            <SegmentedControl
                                :values="[
                                    {
                                        value: 'private',
                                        label: $t('statusPrivate'),
                                    },
                                    {
                                        value: 'public',
                                        label: $t('statusPublic'),
                                    },
                                ]"
                                name="status"
                                v-model="newBoardStatus"
                            />
                        </div>
                    </div>
                    <input
                        type="submit"
                        class="button bg-primary hover:bg-primary-hover w-full text-center px-6 py-3 rounded-lg text-white"
                        :value="$t('saveBoard')"
                    />
                </form>
            </div>
        </ModalWindow>
        <ModalWindow v-if="userID === boardUser" v-model="deleteModal">
            <h2 class="text-4xl text-dark dark:text-white mb-3">
                {{ $t("deleteBoardTitle") }}
            </h2>
            <p class="mb-6">{{ $t("deleteBoardText") }}</p>
            <button
                @click="deleteBoard"
                type="button"
                class="button bg-primary hover:bg-primary-hover w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
            >
                {{ $t("deleteBoardBtn") }}
            </button>
        </ModalWindow>
        <ModalWindow v-if="userID !== boardUser" v-model="leaveModal">
            <h2 class="text-4xl text-dark dark:text-white mb-3">
                {{ $t("leaveBoardTitle") }}
            </h2>
            <p class="mb-6">{{ $t("leaveBoardText") }}</p>
            <button
                @click="leaveBoard"
                type="button"
                class="button bg-primary hover:bg-primary-hover w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
            >
                {{ $t("leaveBoardBtn") }}
            </button>
        </ModalWindow>
        <ModalWindow v-if="userID === boardUser" v-model="inviteModal">
            <InviteModal :boardID="boardID" :invitations="invitations" />
        </ModalWindow>
        <ModalWindow v-model="deleteAreaModal">
            <h2 class="text-4xl text-dark dark:text-white mb-3">
                {{ $t("deleteAreaHeadline") }}
            </h2>
            <p class="mb-6">{{ $t("deleteAreaText") }}</p>
            <button
                @click="deleteArea(deleteAreaModal)"
                type="button"
                class="button bg-primary hover:bg-primary-hover w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
            >
                {{ $t("deleteAreaButton") }}
            </button>
        </ModalWindow>
        <ModalWindow v-model="cardModalOpen" :hideClose="true">
            <CardModal
                v-if="cardModal && selectedCard"
                :card="selectedCard"
                :cardID="cardModal"
                :boardID="boardID * 1"
                :writeAccess="writeAccess"
                :userID="userID"
                :currentUser="session.data.user"
                :openInEditMode="editCardId === cardModal"
                :highlightCommentId="highlightComment"
                v-model="cardModalOpen"
                @card-updated="handleCardUpdated"
                @card-deleted="handleCardDeleted"
                @comment-count-updated="handleCommentCountUpdated"
            />
        </ModalWindow>
    </div>
</template>
<script setup lang="ts">
import { socket } from "~/lib/socket";
import Sortable from "sortablejs";
import { Pencil, UserRoundPlus, Ban, Trash2, X } from "lucide-vue-next";
import { Plus } from "lucide-vue-next";

const nuxtApp = useNuxtApp();

const { data: session } = await useFetch("/api/auth/get-session");
const userID = session.value.data.user.id;

const route = useRoute();
const boardID = ref(route.params.id);

const boardName = ref($t("untitledBoard"));
const boardUser = ref(false);
const boardStyle = ref("kanban");
const boardStatus = ref("private");
const boardImage = ref(null);

const newBoardName = ref(boardName.value);
const newBoardStyle = ref(boardStyle.value);
const newBoardStatus = ref(boardStatus.value);
const newBoardImage = ref(boardImage.value);

const accessError = ref("");
const optionsActive = ref(false);

const deleteModal = ref(false);
const deleteAreaModal = ref(false);
const inviteModal = ref(false);
const invitations = ref([]);

// Add fetchInvitations function
const fetchInvitations = async () => {
    try {
        const { data, error } = await useFetch(
            `/api/data/invite?boardId=${boardID.value}&userId=${userID}`,
            {
                method: "GET",
            },
        );

        if (error.value) {
            console.error("Error fetching invitations:", error.value);
        } else if (data.value?.invitations) {
            invitations.value = data.value.invitations;
        }
    } catch (err) {
        console.error("Error:", err);
    }
};

const areasWrapper = ref(null);
// Lock horizontal scrolling of the board while a modal is open.
const { isOpen: anyModalOpen } = useModalOpen();
const areas = ref([]);
const cards = ref({});

// Guided-tour progress: advance when the user completes each step's action.
const onboarding = useOnboarding();
watch(
    () => areas.value.length,
    (n) => {
        if (n >= 2) onboarding.advance("create-areas");
    },
);
watch(
    () =>
        Object.values(cards.value).reduce(
            (sum, list) => sum + (list?.length || 0),
            0,
        ),
    (n) => {
        if (n >= 1) onboarding.advance("add-card");
    },
);

// The header bell's unread state; refreshed whenever this page marks
// notifications read.
const { refresh: refreshNotifications } = useNotifications();

const cardModal = ref(false);

// Card ids on this board that still have unread notifications for the user;
// drives the "unread changes" highlight on the card tiles.
const unreadCardIds = ref(new Set());

// Load which cards on this board still have unread notifications for this user.
const refreshUnreadCards = async () => {
    try {
        const res = await $fetch(`/api/data/notifications?userId=${userID}`);
        const ids = new Set();
        for (const n of res?.notifications || []) {
            if (
                !n.isRead &&
                n.cardId &&
                String(n.boardId) === String(boardID.value)
            ) {
                ids.add(n.cardId);
            }
        }
        // A card that's already open is being read; never highlight it.
        if (cardModal.value) ids.delete(cardModal.value);
        unreadCardIds.value = ids;
    } catch (err) {
        console.error("Error loading unread cards:", err);
    }
};

// Opening a card marks its notifications read; opening the board marks the
// board-level (non-card) ones read. See server/api/data/notifications.ts.
// The header bell reads the same shared state, so refresh it once the server
// has been updated — otherwise its unread dot keeps glowing until a reload.
const markCardNotificationsRead = (cardId) =>
    $fetch(`/api/data/notifications?cardId=${cardId}`, {
        method: "PATCH",
    })
        .then(() => refreshNotifications(userID))
        .catch((err) =>
            console.error("Error marking card notifications read:", err),
        );
const markBoardNotificationsRead = () =>
    $fetch(`/api/data/notifications?boardId=${boardID.value}`, {
        method: "PATCH",
    })
        .then(() => refreshNotifications(userID))
        .catch((err) =>
            console.error("Error marking board notifications read:", err),
        );

// Drives the modal's open/close animation. `cardModal` (the card id) is kept a
// little longer so the card content stays mounted through the close animation
// (otherwise the box would collapse mid-exit).
const cardModalOpen = ref(false);
let cardModalCloseTimer;
watch(cardModal, (id) => {
    if (id) {
        cardModalOpen.value = true;
        // Viewing a card clears its unread highlight and marks it read.
        unreadCardIds.value.delete(id);
        markCardNotificationsRead(id);
    }
});
watch(cardModalOpen, (isOpen) => {
    clearTimeout(cardModalCloseTimer);
    // Clearing the id (which unmounts the content) is deferred so the card
    // stays mounted through the close animation. The watch on `cardModal`
    // below then updates the URL and resets edit mode.
    if (!isOpen) {
        cardModalCloseTimer = setTimeout(() => {
            cardModal.value = false;
        }, 450);
    }
});

// Id of a card just created in this session that should open directly in edit
// mode the first time it is opened. Cleared once that card's modal is closed.
const editCardId = ref(null);

// The currently opened card, resolved from the already-loaded board data so
// the modal can render instantly without refetching.
const selectedCard = computed(() => {
    if (!cardModal.value) return null;
    for (const areaId in cards.value) {
        const found = cards.value[areaId].find(
            (card) => card.id === cardModal.value,
        );
        if (found) return found;
    }
    return null;
});

const newAreaName = ref("");
const newAreaCreation = ref(false);
const newAreaInput = ref(null);

const writeAccess = ref(false);

const router = useRouter();

// Sync cardModal with query param
if (route.query.card) {
    cardModal.value = route.query.card * 1;
}

// A search hit on a comment links to the comment itself, not just its card:
// `?card=12&comment=34` opens the card and scrolls that comment into view.
const highlightComment = ref(
    route.query.comment ? route.query.comment * 1 : null,
);
watch(
    () => route.query.comment,
    (id) => {
        highlightComment.value = id ? id * 1 : null;
    },
);

// Watch for modal changes and update URL
watch(cardModal, (newVal, oldVal) => {
    if (newVal) {
        router.push({ query: { ...route.query, card: newVal } });
    } else {
        const { card, comment, ...rest } = route.query;
        highlightComment.value = null;
        router.push({ query: rest });
        // Once the freshly created card has been opened and closed, subsequent
        // opens should show the normal read-only view.
        if (oldVal && oldVal === editCardId.value) {
            editCardId.value = null;
        }
    }
});

// Open/close the card modal when the `card` query changes without a full page
// load — e.g. clicking a notification for a card on the board you're already
// viewing (same route, so setup doesn't re-run). Guarded so it doesn't loop
// with the watcher above that writes the query.
watch(
    () => route.query.card,
    (card) => {
        const id = card ? card * 1 : false;
        if (id !== cardModal.value) {
            cardModal.value = id;
            if (id) setBodyScrollLock(true);
        }
    },
);

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
    // Locate the card by id across all areas — the payload may omit `area`
    // (e.g. an optimistic update from the modal).
    for (const areaId in cards.value) {
        const list = cards.value[areaId];
        const index = list.findIndex((card) => card.id === updatedCard.id);
        if (index !== -1) {
            // Merge instead of replace so prefetched comments/attachments are
            // preserved when the payload doesn't include them.
            list[index] = { ...list[index], ...updatedCard };
            return;
        }
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

const handleCardDeleted = (card) => {
    const currentIndex = cards.value[card.area].findIndex(
        (item) => item.id === card.id,
    );
    if (currentIndex !== -1) {
        cards.value[card.area].splice(currentIndex, 1);
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
        setBodyScrollLock(false);
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
    newBoardImage.value = boardImage.value;
    optionsActive.value = true;
    setBodyScrollLock(true);
};
const openDeleteAreaModal = (id) => {
    deleteAreaModal.value = id;
    setBodyScrollLock(true);
};
const openInviteModal = () => {
    inviteModal.value = true;
    setBodyScrollLock(true);
    // Final tour step — opening the invite dialog completes the walkthrough.
    onboarding.advance("invite");
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
                image: newBoardImage.value ? newBoardImage.value : null,
                status: newBoardStatus.value,
            },
        });
        if (!data) {
            console.error("Error updating board");
        } else {
            boardName.value = newBoardName.value;
            boardStyle.value = newBoardStyle.value;
            boardStatus.value = newBoardStatus.value;
            boardImage.value = newBoardImage.value;
            optionsActive.value = false;
            setBodyScrollLock(false);
            socket.emit("boardUpdated", {
                boardID: boardID.value,
                boardName: boardName.value,
                boardStyle: boardStyle.value,
                boardStatus: boardStatus.value,
            });

            await nuxtApp.callHook("app:toast", {
                message: $t("boardSaved"),
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
    // Guard against the same card being inserted more than once (e.g. a socket
    // signal received multiple times): update it in place if it already exists,
    // otherwise append it.
    const existingIndex = cards.value[card.area].findIndex(
        (existing) => existing.id === card.id,
    );
    if (existingIndex !== -1) {
        cards.value[card.area][existingIndex] = {
            ...cards.value[card.area][existingIndex],
            ...card,
        };
        return;
    }
    cards.value[card.area].push(card);
};

// A card created locally (via the new-card form) should open directly in edit
// mode the first time it is opened. Cards arriving via socket from other users
// go through handleCardCreated and do not get this treatment.
const handleLocalCardCreated = (card) => {
    editCardId.value = card.id;
    handleCardCreated(card);
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
        message: $t("boardHasBeenDeleted"),
    });
    await navigateTo("/dashboard/");
};

// Who is currently viewing each card, keyed by card id. A snapshot (on join)
// replaces the map wholesale; single-card updates patch one entry.
const cardViewers = ref({});

const handlePresenceUpdated = (entries, isSnapshot = false) => {
    const next = isSnapshot ? {} : { ...cardViewers.value };
    for (const { cardID, users } of entries) {
        if (users?.length) next[cardID] = users;
        else delete next[cardID];
    }
    cardViewers.value = next;
};

const viewersFor = (cardId) =>
    (cardViewers.value[cardId] || []).filter((v) => v.id !== userID);

const handleCommentCountUpdated = ({ cardId, commentCount, comments }) => {
    // Find the card and update its comment count
    for (const areaId in cards.value) {
        const cardIndex = cards.value[areaId].findIndex(
            (card) => card.id === cardId,
        );
        if (cardIndex !== -1) {
            cards.value[areaId][cardIndex].commentCount = commentCount;
            // When the full comments list is provided (modal interactions),
            // keep the prefetched card in sync so reopening shows no shift.
            if (comments) {
                cards.value[areaId][cardIndex].comments = [...comments];
            }
            break;
        }
    }
};

// Menu item styling, matching the dashboard's action menu. Destructive entries
// (delete, leave) use the secondary colour so they don't read as routine.
const menuItemClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-dark hover:bg-primary/10 hover:text-primary dark:text-white";
const menuItemDestructiveClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-dark hover:bg-primary-hover/10 hover:text-primary-hover dark:text-white";

const openDeleteBoard = () => {
    deleteModal.value = true;
    setBodyScrollLock(true);
};

const leaveModal = ref(false);

const openLeaveBoard = () => {
    leaveModal.value = true;
    setBodyScrollLock(true);
};

// Leaving removes the caller's own invitation. The board itself is untouched —
// the owner still has it, and can invite them back.
const leaveBoard = async () => {
    try {
        await $fetch("/api/data/leaveBoard", {
            method: "POST",
            body: { boardId: boardID.value },
        });
        await nuxtApp.callHook("app:toast", { message: $t("boardLeft") });
        setBodyScrollLock(false);
        await navigateTo("/dashboard/");
    } catch (error) {
        console.error("Error leaving board:", error);
        await nuxtApp.callHook("app:toast", {
            message: $t("leaveBoardFailed"),
            type: "error",
        });
    }
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
                message: $t("boardDeleted"),
            });
            // Remove all cards when the board is deleted
            cards.value = {};
            socket.emit("boardDeleted", {
                boardID: boardID.value,
            });
            setBodyScrollLock(false);
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
                            onboarding.advance("move-card");
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
                // Don't start an area drag from a form field, so text can be
                // selected in the card/area name inputs. preventOnFilter:false
                // keeps the field's native mouse behaviour (focus/selection).
                filter: "input, textarea, [contenteditable]",
                preventOnFilter: false,
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
        useHead({
            title: data.value.board.name,
        });
        boardUser.value = data.value.board.user;
        boardStyle.value = data.value.board.style || "kanban";
        boardStatus.value = data.value.board.status || "private";
        boardImage.value = data.value.board.image || null;
        newBoardName.value = boardName.value;
        newBoardStyle.value = boardStyle.value;
        newBoardStatus.value = boardStatus.value;
        newBoardImage.value = boardImage.value;
        writeAccess.value = data.value.writeAccess;
        if (data.value.board.user === userID) await fetchInvitations();
    }
} catch (err) {
    useHead({
        title: $t("unknownBoard"),
    });
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
    if (route.query.card) {
        // Clear a deep-linked card that isn't part of the loaded board data,
        // otherwise the modal would open empty and (with hideClose) be stuck.
        if (!selectedCard.value) {
            cardModal.value = false;
            cardModalOpen.value = false;
        } else {
            setBodyScrollLock(true);
        }
    }
    initSort();
    // Board opened: load which cards still have unread activity (for the
    // highlight) and clear the board's non-card notifications (e.g. invitations).
    refreshUnreadCards();
    markBoardNotificationsRead();
});
</script>
