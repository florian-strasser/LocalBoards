<template>
    <NuxtLinkLocale
        :to="'/board/' + props.id"
        :data-board-id="props.id"
        draggable="false"
        @dragstart.prevent
        :style="colorStyle"
        class="relative rounded-lg overflow-clip group"
        :class="color ? 'board-tile-colored' : 'bg-primary'"
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
            class="relative z-20 flex flex-col gap-y-6 justify-between items-start min-h-48 px-6 py-5"
            :class="color ? 'board-tile-body' : 'group-hover:bg-primary-hover'"
        >
            <!-- Right-aligned so the top-left corner stays free for the drag
                 handle. The board-style icon used to live here too and made the
                 corner busy; the board's layout is obvious once it's open. -->
            <div
                class="w-full flex items-center justify-end gap-2"
                :class="color ? 'board-tile-fg' : 'text-white'"
            >
                <!-- Pulsing dot when the board has unread notifications. -->
                <span
                    v-if="props.unreadCount > 0"
                    class="relative flex size-3 shrink-0"
                >
                    <span
                        class="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                        :class="color ? 'board-tile-solid' : 'bg-white'"
                    ></span>
                    <span
                        class="relative inline-flex size-3 rounded-full shadow-md"
                        :class="color ? 'board-tile-solid' : 'bg-white'"
                    ></span>
                </span>
                <!-- "Shared" badge for boards the user doesn't own. -->
                <span
                    v-if="!props.owned"
                    class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="color ? 'board-tile-badge' : 'bg-white/20'"
                    >{{ $t("sharedBadge") }}</span
                >
            </div>
            <div class="flex items-end justify-between gap-3 w-full">
                <!-- The name plate is the tile's foreground colour with the
                     board's own colour as its text, so it inverts as a pair:
                     white plate on a dark board, dark plate on a pale one. -->
                <div
                    class="px-3 py-2 rounded-lg min-w-0 truncate"
                    :class="
                        color
                            ? 'board-tile-name'
                            : 'bg-white text-primary group-hover:text-primary-hover'
                    "
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
                        class="size-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-medium ring-2"
                        :class="
                            color
                                ? 'board-tile-avatar'
                                : 'bg-primary text-white ring-white'
                        "
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
                        class="size-8 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-medium ring-2"
                        :class="color ? 'board-tile-ring' : 'ring-white'"
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
import { boardTextColor, normalizeBoardColor } from "@/utils/boardColor";
const props = defineProps({
    id: Number,
    name: String,
    image: String,
    // The board's own tile colour as `#rrggbb`, or null/absent for the default
    // (the instance's primary colour).
    color: { type: String, default: null },
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

// Re-validated here rather than trusted: the value is written into a CSS custom
// property, and a stored colour predating validation (or one an API client
// pushed straight into the column) must not reach the stylesheet.
const color = computed(() => normalizeBoardColor(props.color));

// Two variables drive the whole tile — the colour itself and the one readable
// thing to draw on it. Everything else (the hover shade, the translucent badge)
// is derived from them in CSS, so there is a single place the palette lives.
const colorStyle = computed(() =>
    color.value
        ? {
              "--board-color": color.value,
              "--board-fg": boardTextColor(color.value),
          }
        : undefined,
);
</script>
