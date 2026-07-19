<template>
    <div>
        <h2 class="text-4xl text-dark dark:text-white text-left mb-3">
            {{ $t("permissions") }}
        </h2>
        <div
            v-if="invitations.length > 0"
            class="relative pb-5 mb-5 border-b border-primary/30 dark:border-white/30"
        >
            <ul class="space-y-2">
                <li
                    v-for="invitation in invitations"
                    :key="invitation.id"
                    class="flex justify-between items-center"
                >
                    <div class="flex mt-2 items-center gap-x-2">
                        <div class="w-8 shrink-0 grow-0">
                            <div
                                class="relative aspect-square rounded-full overflow-clip"
                            >
                                <img
                                    v-if="invitation.userImage"
                                    :src="invitation.userImage"
                                    class="absolute top-0 left-0 w-full h-full object-cover"
                                />
                                <div
                                    v-else
                                    class="absolute top-0 left-0 w-full h-full bg-primary text-white flex justify-center items-center"
                                >
                                    {{ invitation.userName.substring(0, 1) }}
                                </div>
                            </div>
                        </div>
                        <span class="text-sm grow shrink">{{
                            invitation.userName
                        }}</span>
                    </div>
                    <div class="flex gap-x-2">
                        <div class="flex gap-x-2">
                            <Eye class="size-4" />
                            <Pencil
                                v-if="invitation.permission === 'edit'"
                                class="size-4"
                            />
                            <Pencil
                                v-if="invitation.permission !== 'edit'"
                                class="size-4"
                            />
                        </div>
                        <button
                            @click="removeInvitation(invitation.user)"
                            class="text-primary hover:text-primary-hover"
                            v-tooltip="$t('remove')"
                        >
                            <Trash class="size-4" />
                        </button>
                    </div>
                </li>
            </ul>
            <div
                class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white dark:bg-slate px-2 text-sm"
            >
                {{ $t("inviteMoreUser") }}
            </div>
        </div>
        <form
            @submit.prevent="createInvitation"
            class="text-left space-y-5"
            autocomplete="off"
        >
            <div class="relative">
                <label class="block text-sm mb-1">
                    {{ $t("inviteUserSearchLabel") }}
                    <span class="text-primary ml-1">*</span>
                </label>
                <!-- Custom user-search autocomplete. The extra attributes stop
                     the browser's own autofill (Safari/iCloud Keychain in
                     particular treats a "Benutzer"/e-mail field as a login and
                     overlays saved-password suggestions on top of our list). A
                     non-credential name, combobox semantics and the password-
                     manager ignore hints together suppress that. -->
                <input
                    type="text"
                    name="lb-invite-search"
                    class="form-control"
                    v-model="search"
                    :placeholder="$t('inviteUserSearchPlaceholder')"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    role="combobox"
                    aria-autocomplete="list"
                    :aria-expanded="showList"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    @focus="openList"
                    @input="onInput"
                    @blur="onBlur"
                />
                <ul
                    v-if="showList"
                    class="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-xl border border-gray/20 dark:border-white/15 bg-white dark:bg-slate shadow-xl p-1"
                >
                    <li
                        v-if="loading && results.length === 0"
                        class="px-2 py-1.5 text-sm text-gray"
                    >
                        …
                    </li>
                    <li
                        v-else-if="!loading && results.length === 0"
                        class="px-2 py-1.5 text-sm text-gray"
                    >
                        {{ $t("inviteUserNoResults") }}
                    </li>
                    <li v-for="u in results" :key="u.id">
                        <button
                            type="button"
                            @mousedown.prevent="pick(u)"
                            class="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-primary/10 dark:hover:bg-white/10 text-dark dark:text-white"
                        >
                            <span
                                class="size-6 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center shrink-0 text-xs"
                            >
                                <img
                                    v-if="u.image"
                                    :src="u.image"
                                    class="w-full h-full object-cover"
                                />
                                <template v-else>{{
                                    (u.name || "?").charAt(0)
                                }}</template>
                            </span>
                            <span class="grow text-left min-w-0">
                                <span class="block truncate">{{ u.name }}</span>
                                <span
                                    v-if="u.emailMasked"
                                    class="block text-xs text-gray truncate"
                                    >{{ u.emailMasked }}</span
                                >
                            </span>
                            <Check
                                v-if="selectedUser && selectedUser.id === u.id"
                                class="size-4 text-primary shrink-0"
                            />
                        </button>
                    </li>
                </ul>
            </div>
            <div>
                <label class="mb-1 block text-sm/6 font-medium text-gray">{{
                    $t("permission")
                }}</label>
                <SegmentedControl
                    :values="[
                        { value: 'read', label: $t('permissionRead') },
                        { value: 'edit', label: $t('permissionWrite') },
                    ]"
                    name="permission"
                    v-model="invitePermission"
                />
            </div>
            <input
                type="submit"
                :disabled="!selectedUser"
                class="button bg-primary hover:bg-primary-hover w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                :value="$t('sendInvitation')"
            />
        </form>
    </div>
</template>
<script setup lang="ts">
import { Trash, Eye, EyeOff, Pencil, PencilOff, Check } from "lucide-vue-next";
const props = defineProps({
    boardID: String,
    invitations: Array,
});

// Convert the invitations prop to a ref
const invitations = ref(props.invitations || []);

const nuxtApp = useNuxtApp();

const invitePermission = ref("read");

// --- Searchable user picker -------------------------------------------------
// Users are searched server-side by name or email; only id/name/image come
// back (never the email), and an invite is sent by the picked user's id.
const search = ref("");
const results = ref([]);
const selectedUser = ref(null);
const showList = ref(false);
const loading = ref(false);
let debounceTimer;
let requestSeq = 0;

const fetchUsers = async () => {
    // Keep the previous results visible until the new ones arrive (no flicker),
    // and ignore responses that a newer keystroke has already superseded.
    const seq = ++requestSeq;
    loading.value = true;
    try {
        const data = await $fetch(
            `/api/data/users/search?boardId=${Number(props.boardID)}&q=${encodeURIComponent(search.value)}`,
        );
        if (seq !== requestSeq) return;
        results.value = data.users || [];
    } catch (err) {
        if (seq !== requestSeq) return;
        results.value = [];
    } finally {
        if (seq === requestSeq) loading.value = false;
    }
};

const onInput = () => {
    // Typing invalidates any prior pick and re-searches (debounced).
    selectedUser.value = null;
    showList.value = true;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchUsers, 200);
};

const openList = () => {
    showList.value = true;
    if (results.value.length === 0) fetchUsers();
};

// Close after a beat so a click on an option still registers.
const onBlur = () => {
    setTimeout(() => (showList.value = false), 120);
};

const pick = (user) => {
    selectedUser.value = user;
    search.value = user.name;
    showList.value = false;
};

const { data: session } = await useFetch("/api/auth/get-session");

const userID = session.value.data.user.id;

const createInvitation = async () => {
    if (!selectedUser.value) return;
    try {
        const data = await $fetch("/api/data/invite", {
            method: "POST",
            body: {
                boardId: Number(props.boardID),
                userId: selectedUser.value.id,
                permission: invitePermission.value,
            },
        });

        if (data.error) {
            await nuxtApp.callHook("app:toast", {
                message: data.error,
            });
        } else if (data.message) {
            await nuxtApp.callHook("app:toast", {
                message: $t("invitationSent"),
            });
            search.value = "";
            selectedUser.value = null;
            results.value = [];
            invitePermission.value = "read";
            // Add the new invitation to the local ref
            if (data.invitation) {
                invitations.value.push(data.invitation);
            }
        }
    } catch (err) {
        await nuxtApp.callHook("app:toast", {
            message: err,
        });
    }
};

const removeInvitation = async (userId) => {
    try {
        const data = await $fetch(
            `/api/data/invite?boardId=${Number(props.boardID)}&userId=${userId}`,
            {
                method: "DELETE",
            },
        );

        if (data.message) {
            await nuxtApp.callHook("app:toast", {
                message: $t("invitationRemoved"),
            });
            // Remove the invitation from the local ref
            invitations.value = invitations.value.filter(
                (invitation) => invitation.user !== userId,
            );
        }
    } catch (err) {
        console.error("Error removing invitation:", err);
    }
};
</script>
