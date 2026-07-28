<template>
    <NuxtLinkLocale
        :to="'/board/' + props.id"
        :data-board-id="props.id"
        draggable="false"
        @dragstart.prevent
        class="relative rounded-lg overflow-clip group bg-primary"
    >
        <!-- Drag handle for arranging the dashboard. Kept separate from the tile
             body so a normal click still opens the board; the handle appears on
             hover and never navigates. -->
        <button
            v-if="props.draggable"
            type="button"
            class="board-drag-handle absolute top-2 left-2 z-30 flex size-7 items-center justify-center rounded-md bg-black/25 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-grab active:cursor-grabbing"
            :aria-label="$t('dragToArrange')"
            @click.prevent.stop
        >
            <GripVertical class="size-4" />
        </button>
        <div
            class="relative z-20 flex flex-col gap-y-6 justify-between items-start min-h-48 px-6 py-5 group-hover:bg-primary-hover"
        >
            <!-- Right-aligned so the top-left corner stays free for the drag
                 handle. The board-style icon used to live here too and made the
                 corner busy; the board's layout is obvious once it's open. -->
            <div class="text-white w-full flex items-center justify-end gap-2">
                <!-- Pulsing dot when the board has unread notifications. -->
                <span
                    v-if="props.unreadCount > 0"
                    class="relative flex size-3 shrink-0"
                >
                    <span
                        class="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping"
                    ></span>
                    <span
                        class="relative inline-flex size-3 rounded-full bg-white shadow-md"
                    ></span>
                </span>
                <!-- "Shared" badge for boards the user doesn't own. -->
                <span
                    v-if="!props.owned"
                    class="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium"
                    >{{ $t("sharedBadge") }}</span
                >
            </div>
            <div class="flex items-end justify-between gap-3 w-full">
                <div
                    class="px-3 py-2 rounded-lg bg-white text-primary group-hover:text-primary-hover min-w-0 truncate"
                >
                    {{ props.name }}
                </div>
                <!-- Collaborators: up to four avatars, then a "+N" overflow bubble. -->
                <div
                    v-if="props.members && props.members.length"
                    class="flex -space-x-2 shrink-0"
                >
                    <span
                        v-for="m in props.members"
                        :key="m.id"
                        class="size-8 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center text-xs font-medium ring-2 ring-white"
                        :title="m.name"
                    >
                        <img
                            v-if="m.image"
                            :src="m.image"
                            :alt="m.name"
                            class="w-full h-full object-cover"
                        />
                        <template v-else>{{
                            (m.name || "?").charAt(0).toUpperCase()
                        }}</template>
                    </span>
                    <span
                        v-if="props.memberCount > props.members.length"
                        class="size-8 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-medium ring-2 ring-white"
                        :title="`+${props.memberCount - props.members.length}`"
                    >
                        +{{ props.memberCount - props.members.length }}
                    </span>
                </div>
            </div>
        </div>
        <img
            v-if="props.image"
            :src="props.image"
            :alt="props.name"
            class="absolute top-0 left-0 w-full h-full object-cover z-10"
        />
    </NuxtLinkLocale>
</template>
<script setup lang="ts">
import { GripVertical } from "lucide-vue-next";
const props = defineProps({
    id: Number,
    name: String,
    image: String,
    // Whether the current user owns this board; false shows a "shared" badge.
    owned: { type: Boolean, default: true },
    // Whether to show the drag handle (dashboard arrangement view).
    draggable: { type: Boolean, default: false },
    // Up to four board members ({ id, name, image }) for the avatar stack.
    members: { type: Array as () => { id: string; name: string; image?: string }[], default: () => [] },
    // Total member count, so the tile can show a "+N" bubble beyond four avatars.
    memberCount: { type: Number, default: 0 },
    // Number of unread notifications for this user on this board; > 0 shows the
    // pulsing dot.
    unreadCount: { type: Number, default: 0 },
});
</script>
