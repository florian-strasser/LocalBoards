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
                            class="text-primary hover:text-secondary"
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
        <form @submit.prevent="createInvitation" class="text-left space-y-5">
            <div>
                <InputField
                    type="email"
                    name="inviteEmail"
                    :label="$t('userEmail')"
                    required
                    v-model="inviteEmail"
                />
            </div>
            <div>
                <label class="block text-sm/6 font-medium text-gray">{{
                    $t("permission")
                }}</label>
                <RadioList
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
                class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                :value="$t('sendInvitation')"
            />
        </form>
    </div>
</template>
<script setup lang="ts">
import { Trash, Eye, EyeOff, Pencil, PencilOff } from "lucide-vue-next";
const props = defineProps({
    boardID: String,
    invitations: Array,
});

// Convert the invitations prop to a ref
const invitations = ref(props.invitations || []);

const nuxtApp = useNuxtApp();

const inviteEmail = ref("");
const invitePermission = ref("read");

const { data: session } = await useFetch("/api/auth/get-session");

const userID = session.value.data.user.id;

const createInvitation = async () => {
    try {
        const data = await $fetch("/api/data/invite", {
            method: "POST",
            body: {
                boardId: Number(props.boardID),
                mail: inviteEmail.value,
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
            inviteEmail.value = "";
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
