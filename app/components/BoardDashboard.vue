<template>
    <div>
        <!-- Ungrouped boards: shown first, no header, with the "new board" tile.
             New and newly-shared boards land here until the user files them. -->
        <div
            ref="ungroupedGrid"
            data-group-id=""
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8"
        >
            <BoardTile
                v-for="board in ungrouped"
                :key="board.id"
                :id="board.id"
                :name="board.name"
                :image="board.image"
                :owned="board.owned"
                :members="board.members"
                :member-count="board.memberCount"
                :unread-count="board.unreadCount"
                draggable
            />
            <button
                type="button"
                class="bg-white dark:bg-slate cursor-pointer text-primary hover:bg-primary-hover hover:text-white min-h-48 flex flex-col justify-center items-center rounded-lg"
                @click="$emit('new-board')"
            >
                <Plus class="size-10" />
            </button>
        </div>

        <!-- The user's groups. Each is its own drop target; boards can be dragged
             within a group, between groups, or to/from the ungrouped area. -->
        <div ref="groupsWrapper" class="mt-4">
            <section
                v-for="group in groups"
                :key="group.id"
                :data-group-section="group.id"
                class="mt-8"
            >
                <div class="mb-4 flex items-center gap-2">
                    <button
                        type="button"
                        class="group-drag-handle flex size-7 shrink-0 items-center justify-center rounded-md text-gray hover:text-dark dark:hover:text-white cursor-grab active:cursor-grabbing"
                        :aria-label="$t('dragToArrange')"
                    >
                        <GripVertical class="size-5" />
                    </button>
                    <button
                        type="button"
                        class="flex size-7 shrink-0 items-center justify-center rounded-md text-gray hover:text-dark dark:hover:text-white"
                        :aria-label="$t('collapse')"
                        @click="toggleCollapse(group)"
                    >
                        <ChevronDown
                            class="size-5 transition-transform"
                            :class="{ '-rotate-90': group.collapsed }"
                        />
                    </button>
                    <input
                        v-model="group.name"
                        class="min-w-0 grow bg-transparent text-2xl font-bold text-dark dark:text-white focus:outline-none"
                        @change="renameGroup(group)"
                        @keydown.enter="($event.target as HTMLInputElement).blur()"
                    />
                    <span class="shrink-0 text-sm text-gray">{{
                        boardsInGroup(group.id).length
                    }}</span>
                    <button
                        type="button"
                        class="flex size-7 shrink-0 items-center justify-center rounded-md text-gray hover:text-secondary"
                        :aria-label="$t('deleteGroup')"
                        @click="askDeleteGroup(group)"
                    >
                        <Trash2 class="size-5" />
                    </button>
                </div>
                <div
                    v-show="!group.collapsed"
                    :ref="(el) => registerGroupGrid(group.id, el)"
                    :data-group-id="group.id"
                    class="grid min-h-24 grid-cols-1 gap-8 rounded-lg sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                    :class="
                        boardsInGroup(group.id).length === 0
                            ? 'border-2 border-dashed border-gray/25 p-4'
                            : ''
                    "
                >
                    <BoardTile
                        v-for="board in boardsInGroup(group.id)"
                        :key="board.id"
                        :id="board.id"
                        :name="board.name"
                                :image="board.image"
                        :owned="board.owned"
                        :members="board.members"
                        :member-count="board.memberCount"
                        :unread-count="board.unreadCount"
                        draggable
                    />
                    <p
                        v-if="boardsInGroup(group.id).length === 0"
                        class="col-span-full self-center text-center text-sm text-gray"
                    >
                        {{ $t("emptyGroupHint") }}
                    </p>
                </div>
            </section>
        </div>

        <!-- Add a new group. -->
        <button
            type="button"
            class="mt-8 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
            @click="createGroup"
        >
            <FolderPlus class="size-5" />
            {{ $t("newGroup") }}
        </button>

        <ModalWindow v-model="deleteGroupModal">
            <h2 class="text-4xl text-dark dark:text-white mb-3">
                {{ $t("deleteGroupTitle") }}
            </h2>
            <p class="mb-6">{{ $t("deleteGroupText") }}</p>
            <button
                type="button"
                class="button bg-primary hover:bg-primary-hover w-full rounded-lg px-6 py-3 text-center text-white"
                @click="confirmDeleteGroup"
            >
                {{ $t("deleteGroupBtn") }}
            </button>
        </ModalWindow>
    </div>
</template>
<script setup lang="ts">
import Sortable from "sortablejs";
import {
    Plus,
    GripVertical,
    ChevronDown,
    Trash2,
    FolderPlus,
} from "lucide-vue-next";

const nuxtApp = useNuxtApp();

// --- data -----------------------------------------------------------------
const { data, error } = await useFetch("/api/data/dashboard");
if (error.value) {
    throw createError({
        status: 500,
        statusText: "Can't connect to the database",
    });
}

// The authoritative model. SortableJS reorders the DOM on drop; we then read the
// DOM back into these refs so Vue and the server agree on one arrangement.
const boards = ref<any[]>((data.value?.boards ?? []).map((b: any) => ({ ...b })));
const groups = ref<any[]>((data.value?.groups ?? []).map((g: any) => ({ ...g })));

// Boards with no placement yet sort after placed ones, newest first (the fetch
// already returns id-desc), so a freshly created/shared board shows up on top.
const sortBoards = (list: any[]) =>
    [...list].sort((a, b) => {
        const sa = a.placementSort,
            sb = b.placementSort;
        if (sa == null && sb == null) return 0; // keep fetch order (id desc)
        if (sa == null) return -1;
        if (sb == null) return 1;
        return sa - sb;
    });

const ungrouped = computed(() =>
    sortBoards(boards.value.filter((b) => b.groupId == null)),
);
const boardsInGroup = (gid: number) =>
    sortBoards(boards.value.filter((b) => b.groupId === gid));

// --- persistence ----------------------------------------------------------
// After any board drag, rebuild the model from the DOM (the single source of
// truth once SortableJS has moved things) and persist the whole arrangement.
const ungroupedGrid = ref<HTMLElement | null>(null);
const groupGrids = new Map<number, HTMLElement>();
const registerGroupGrid = (gid: number, el: any) => {
    if (el) groupGrids.set(gid, el);
    else groupGrids.delete(gid);
};

const readArrangementFromDom = () => {
    const placements: { boardId: number; groupId: number | null; sort: number }[] =
        [];
    const apply = (grid: HTMLElement | null, groupId: number | null) => {
        if (!grid) return;
        const tiles = grid.querySelectorAll("[data-board-id]");
        tiles.forEach((el, i) => {
            const boardId = Number((el as HTMLElement).dataset.boardId);
            if (boardId) placements.push({ boardId, groupId, sort: i });
        });
    };
    apply(ungroupedGrid.value, null);
    for (const [gid, grid] of groupGrids) apply(grid, gid);
    return placements;
};

const persistArrangement = async () => {
    const placements = readArrangementFromDom();
    // Update the local model so computed lists match the new DOM order.
    const byId = new Map(placements.map((p) => [p.boardId, p]));
    for (const b of boards.value) {
        const p = byId.get(b.id);
        if (p) {
            b.groupId = p.groupId;
            b.placementSort = p.sort;
        }
    }
    try {
        await $fetch("/api/data/board-arrangement", {
            method: "POST",
            body: { placements },
        });
    } catch (e) {
        console.error("Failed to save arrangement:", e);
    }
};

// --- SortableJS wiring -----------------------------------------------------
let sortables: any[] = [];
const destroySortables = () => {
    sortables.forEach((s) => s.destroy());
    sortables = [];
};

const wireBoardGrids = () => {
    const grids: HTMLElement[] = [];
    if (ungroupedGrid.value) grids.push(ungroupedGrid.value);
    for (const el of groupGrids.values()) grids.push(el);
    for (const grid of grids) {
        sortables.push(
            Sortable.create(grid, {
                group: "dashboard-boards",
                handle: ".board-drag-handle",
                draggable: "[data-board-id]", // never the "new board" button
                animation: 150,
                forceFallback: true,
                onEnd: () => persistArrangement(),
            }),
        );
    }
};

const wireGroupReorder = () => {
    if (!groupsWrapper.value) return;
    sortables.push(
        Sortable.create(groupsWrapper.value, {
            handle: ".group-drag-handle",
            draggable: "[data-group-section]",
            animation: 150,
            forceFallback: true,
            onEnd: async () => {
                const order = Array.from(
                    groupsWrapper.value!.querySelectorAll("[data-group-section]"),
                ).map((el) => Number((el as HTMLElement).dataset.groupSection));
                // Reorder the local model to match.
                groups.value.sort(
                    (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
                );
                try {
                    await $fetch("/api/data/board-arrangement", {
                        method: "POST",
                        body: { groupOrder: order },
                    });
                } catch (e) {
                    console.error("Failed to save group order:", e);
                }
            },
        }),
    );
};

const groupsWrapper = ref<HTMLElement | null>(null);

// Re-wire whenever the set of grids changes (a group added/removed), on the next
// tick so refs for new grids exist.
const rewire = () =>
    nextTick(() => {
        destroySortables();
        wireBoardGrids();
        wireGroupReorder();
    });

onMounted(rewire);
onBeforeUnmount(destroySortables);

// --- group CRUD -----------------------------------------------------------
const createGroup = async () => {
    try {
        const res: any = await $fetch("/api/data/board-groups", {
            method: "POST",
            body: { name: $t("newGroupName") },
        });
        if (res?.group) {
            groups.value.push({ ...res.group });
            rewire();
        }
    } catch (e) {
        console.error("Failed to create group:", e);
    }
};

const renameGroup = async (group: any) => {
    const name = (group.name || "").trim();
    if (!name) {
        group.name = $t("newGroupName");
    }
    try {
        await $fetch("/api/data/board-groups", {
            method: "PATCH",
            body: { id: group.id, name: group.name.trim() },
        });
    } catch (e) {
        console.error("Failed to rename group:", e);
    }
};

const toggleCollapse = async (group: any) => {
    group.collapsed = !group.collapsed;
    try {
        await $fetch("/api/data/board-groups", {
            method: "PATCH",
            body: { id: group.id, collapsed: group.collapsed },
        });
    } catch (e) {
        console.error("Failed to toggle group:", e);
    }
    // A collapsed grid is v-show'd away; re-wire so Sortable tracks the DOM.
    rewire();
};

const deleteGroupModal = ref(false);
const groupToDelete = ref<any>(null);
const askDeleteGroup = (group: any) => {
    groupToDelete.value = group;
    deleteGroupModal.value = true;
    setBodyScrollLock(true);
};
const confirmDeleteGroup = async () => {
    const group = groupToDelete.value;
    deleteGroupModal.value = false;
    setBodyScrollLock(false);
    if (!group) return;
    try {
        await $fetch("/api/data/board-groups", {
            method: "DELETE",
            body: { id: group.id },
        });
        // Its boards fall back to ungrouped locally too.
        for (const b of boards.value) if (b.groupId === group.id) b.groupId = null;
        groups.value = groups.value.filter((g) => g.id !== group.id);
        rewire();
    } catch (e) {
        console.error("Failed to delete group:", e);
    }
};

defineEmits(["new-board"]);
</script>
