<template>
    <div class="min-h-screen flex flex-col justify-between">
        <AppHeader />
        <ContentWrapper>
            <SectionHeader
                :tooltip="$t('createNewBoard')"
                asButton
                @sectionHeaderButtonClicked="createBoard = true"
                >{{ $t("yourBoards") }}</SectionHeader
            >
            <YourBoards
                v-if="session"
                :userID="session.user.id"
                @newBoardButtonClicked="createBoard = true"
            />
            <SharedBoards v-if="session" :userID="session.user.id" />
        </ContentWrapper>
        <ModalWindow v-model="createBoard">
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
                        <label class="block text-sm/6 font-medium text-gray">{{
                            $t("boardStyle")
                        }}</label>
                        <RadioList
                            :values="[
                                { value: 'kanban', label: $t('kanBan') },
                                { value: 'todo', label: $t('toDo') },
                            ]"
                            name="style"
                            v-model="newBoardStyle"
                        />
                    </div>
                    <div>
                        <label class="block text-sm/6 font-medium text-gray">{{
                            $t("boardStatus")
                        }}</label>
                        <RadioList
                            :values="[
                                {
                                    value: 'private',
                                    label: $t('statusPrivate'),
                                },
                                { value: 'public', label: $t('statusPublic') },
                            ]"
                            name="status"
                            v-model="newBoardStatus"
                        />
                    </div>
                    <input
                        type="submit"
                        class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                        :value="$t('createBoard')"
                    />
                </form>
            </div>
        </ModalWindow>
        <AppFooter />
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";

const nuxtApp = useNuxtApp();

useHead({
    title: $t("dashboard"),
});

const relativeFetch = ((url: string, opts?: any) => {
    try {
        if (url.startsWith("http")) url = new URL(url).pathname;
    } catch {}
    return useFetch(url, opts);
}) as any;

const { data: session } = await authClient.useSession(relativeFetch);

const userID = session.value.user.id;

const createBoard = ref(false);

const newBoardName = ref($t("untitledBoard"));
const newBoardStyle = ref("kanban");
const newBoardStatus = ref("private");

const saveBoard = async () => {
    const newName = newBoardName.value.trim();
    if (!newName) return;

    try {
        const data = await $fetch("/api/data/board", {
            method: "POST",
            body: {
                id: null,
                userId: userID,
                name: newName,
                style: newBoardStyle.value,
                status: newBoardStatus.value,
            },
        });
        if (!data) {
            await nuxtApp.callHook("app:toast", {
                message: $t("error_creating_board"),
            });
        } else {
            await nuxtApp.callHook("app:toast", {
                message: $t("boardCreated"),
            });
            await navigateTo(`/board/${data.board.id}`);
        }
    } catch (err) {
        console.error("Error:", err);
    }
};
</script>
