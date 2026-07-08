<template>
    <NuxtLinkLocale
        :to="'/board/' + props.id"
        class="relative rounded-lg overflow-clip group bg-primary"
    >
        <div
            class="relative z-20 flex flex-col gap-y-6 justify-between items-start min-h-48 px-6 py-5 group-hover:bg-secondary"
        >
            <div class="text-white w-full flex items-center">
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
                <Kanban
                    v-if="props.style === 'kanban'"
                    class="size-8 ml-auto mr-0"
                />
                <ListCheck
                    v-if="props.style === 'todo'"
                    class="size-8 ml-auto mr-0"
                />
            </div>
            <div class="flex items-end justify-between gap-3 w-full">
                <div
                    class="px-3 py-2 rounded-lg bg-white text-primary group-hover:text-secondary min-w-0 truncate"
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
import { ListCheck, Kanban } from "lucide-vue-next";
const props = defineProps({
    id: Number,
    name: String,
    style: String,
    image: String,
    // Up to four board members ({ id, name, image }) for the avatar stack.
    members: { type: Array as () => { id: string; name: string; image?: string }[], default: () => [] },
    // Total member count, so the tile can show a "+N" bubble beyond four avatars.
    memberCount: { type: Number, default: 0 },
    // Number of unread notifications for this user on this board; > 0 shows the
    // pulsing dot.
    unreadCount: { type: Number, default: 0 },
});
</script>
