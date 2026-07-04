<template>
    <div class="min-h-svh flex flex-col justify-between overflow-clip">
        <AppHeader />
        <ContentWrapper>
            <SectionHeader
                :tooltip="$t('createNewBoard')"
                asButton
                onboardingTarget="new-board"
                @sectionHeaderButtonClicked="openCreateBoard"
                >{{ $t("yourBoards") }}</SectionHeader
            >
            <YourBoards
                v-if="session"
                :userID="session.data.user.id"
                @newBoardButtonClicked="openCreateBoard"
            />
            <SharedBoards v-if="session" :userID="session.data.user.id" />
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
                        <InputImage
                            :label="$t('boardThumbnail')"
                            :images="[
                                '/images/board_placeholder_01.png',
                                '/images/board_placeholder_02.png',
                                '/images/board_placeholder_03.png',
                                '/images/board_placeholder_04.png',
                                '/images/board_placeholder_05.png',
                                '/images/board_placeholder_06.png',
                            ]"
                            v-model="newBoardImage"
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
    </div>
</template>
<script setup lang="ts">
const nuxtApp = useNuxtApp();

useHead({
    title: $t("dashboard"),
});

const { data: session } = await useFetch("/api/auth/get-session");

const userID = session.value.data.user.id;
const createBoard = ref(false);

// Offer the first-run guided tour to accounts that haven't been onboarded yet.
const onboarding = useOnboarding();
onMounted(() => {
    if (session.value?.data?.user && !session.value.data.user.onboarded) {
        onboarding.openPrompt();
    }
});

const newBoardName = ref($t("untitledBoard"));
const newBoardStyle = ref("kanban");
const newBoardStatus = ref("private");
const newBoardImage = ref(null);

const openCreateBoard = () => {
    createBoard.value = true;
    document.body.style.overflow = "hidden";
};

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
                image: newBoardImage.value,
                status: newBoardStatus.value,
            },
        });
        document.body.style.overflow = "auto";
        if (!data) {
            await nuxtApp.callHook("app:toast", {
                message: $t("error_creating_board"),
            });
        } else {
            await nuxtApp.callHook("app:toast", {
                message: $t("boardCreated"),
            });
            // Advance the tour from "create a board" before moving on.
            onboarding.advance("create-board");
            await navigateTo(`/board/${data.board.id}`);
        }
    } catch (err) {
        console.error("Error:", err);
    }
};
</script>
