<template>
    <div>
        <h2 class="text-4xl text-primary text-left mb-3">
            {{ $t("permissions") }}
        </h2>
        <div
            v-if="invitations.length > 0"
            class="relative pb-5 mb-5 border-b border-primary/30"
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
                class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white px-2 text-sm"
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
import { authClient } from "@/lib/auth-client";
import { Trash, Eye, EyeOff, Pencil, PencilOff } from "lucide-vue-next";
const props = defineProps({
    boardID: String,
});

const nuxtApp = useNuxtApp();

const inviteEmail = ref("");
const invitePermission = ref("read");
const invitations = ref([]);

const relativeFetch = ((url: string, opts?: any) => {
    try {
        if (url.startsWith("http")) url = new URL(url).pathname;
    } catch {}
    return useFetch(url, opts);
}) as any;

const { data: session } = await authClient.useSession(relativeFetch);

const userID = session.value.user.id;

try {
    const { data, error } = await useFetch(
        `/api/data/invite?boardId=${props.boardID}&userId=${userID}`,
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

const createInvitation = async () => {
    try {
        const data = await $fetch("/api/data/invite", {
            method: "POST",
            body: {
                boardId: props.boardID,
                userId: userID,
                mail: inviteEmail.value,
                permission: invitePermission.value,
            },
        });
        console.log(data);
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
            // Refetch invitations to update the list
            fetchData();
        }
    } catch (err) {
        console.log(err);
        await nuxtApp.callHook("app:toast", {
            message: err,
        });
    }
};

const removeInvitation = async (userId) => {
    try {
        const data = await $fetch(
            `/api/data/invite?boardId=${props.boardID}&userId=${userID}&deleteUser=${userId}`,
            {
                method: "DELETE",
            },
        );

        if (data.message) {
            await nuxtApp.callHook("app:toast", {
                message: $t("invitationRemoved"),
            });
            // Refetch invitations to update the list
            fetchData();
        }
    } catch (err) {
        console.error("Error removing invitation:", err);
    }
};

const fetchData = async () => {
    const data = await $fetch(
        `/api/data/invite?boardId=${props.boardID}&userId=${userID}`,
        {
            method: "GET",
        },
    );

    if (data.invitations) {
        invitations.value = data.invitations;
    }
};
</script>
