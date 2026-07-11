<template>
    <div class="min-h-svh flex flex-col justify-between overflow-clip">
        <AppHeader />
        <ContentWrapper>
            <SectionHeader
                :tooltip="$t('createNewBoard')"
                asButton
                onboardingTarget="new-board"
                @sectionHeaderButtonClicked="openCreateBoard"
            >
                {{ $t("yourBoards") }}
                <template #actions>
                    <ActionMenu :tooltip="$t('moreOptions')">
                        <button
                            type="button"
                            @click="openImport"
                            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-dark hover:bg-primary/10 hover:text-primary dark:text-white"
                        >
                            <Import class="size-4 shrink-0" />
                            {{ $t("importFromTrello") }}
                        </button>
                    </ActionMenu>
                </template>
            </SectionHeader>
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
                        class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white"
                        :value="$t('createBoard')"
                    />
                </form>
            </div>
        </ModalWindow>
        <ModalWindow v-model="importBoard">
            <form @submit.prevent="importTrelloBoard" class="space-y-5 text-left">
                <h2 class="text-4xl text-dark dark:text-white">
                    {{ $t("importFromTrello") }}
                </h2>
                <p class="text-sm text-gray">{{ $t("trelloImportHint") }}</p>
                <label class="block w-full space-y-1">
                    <span class="block text-sm"
                        >{{ $t("trelloUrlLabel")
                        }}<span class="ml-1 text-primary">*</span></span
                    >
                    <input
                        type="url"
                        v-model="trelloUrl"
                        required
                        placeholder="https://trello.com/b/…"
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="off"
                        spellcheck="false"
                        class="form-control"
                    />
                </label>
                <input
                    type="submit"
                    :disabled="importing"
                    :value="importing ? $t('importing') : $t('importBoardBtn')"
                    class="button w-full cursor-pointer rounded-lg bg-primary px-6 py-3 text-center text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
                />
            </form>
        </ModalWindow>
    </div>
</template>
<script setup lang="ts">
import { Import } from "lucide-vue-next";

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

// --- Import a board from Trello -------------------------------------------
const importBoard = ref(false);
const trelloUrl = ref("");
const importing = ref(false);

const openImport = () => {
    trelloUrl.value = "";
    importBoard.value = true;
    document.body.style.overflow = "hidden";
};

// Map the server's error codes to a localized message.
const trelloErrorMessage = (code) => {
    const map = {
        TRELLO_INVALID_URL: $t("trelloErrorInvalidUrl"),
        TRELLO_NOT_ACCESSIBLE: $t("trelloErrorNotAccessible"),
        TRELLO_EMPTY: $t("trelloErrorEmpty"),
    };
    return map[code] || $t("trelloErrorGeneric");
};

const importTrelloBoard = async () => {
    if (importing.value) return;
    const url = trelloUrl.value.trim();
    if (!url) return;
    importing.value = true;
    try {
        const data = await $fetch("/api/data/import/trello", {
            method: "POST",
            body: { url },
        });
        if (data?.success && data.board) {
            importBoard.value = false;
            document.body.style.overflow = "auto";
            await nuxtApp.callHook("app:toast", {
                message: $t("boardImported"),
            });
            await navigateTo(`/board/${data.board.id}`);
        } else {
            throw new Error(data?.error || "TRELLO_IMPORT_FAILED");
        }
    } catch (e) {
        await nuxtApp.callHook("app:toast", {
            message: trelloErrorMessage(e?.data?.error || e?.message),
        });
    } finally {
        importing.value = false;
    }
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
