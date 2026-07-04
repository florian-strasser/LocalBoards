<template>
    <div v-if="userList && userList.length > 0">
        <ul>
            <li v-for="(item, index) in userList">
                <UserListItem
                    :id="item.id"
                    :name="item.username"
                    :email="item.email"
                    :index="index"
                    v-model="deleteModal"
                />
            </li>
        </ul>
        <ModalWindow v-model="deleteModal">
            <h2 class="text-4xl text-dark dark:text-white mb-6">
                {{ $t("deleteUserMessage") }}
            </h2>
            <label class="block text-left text-sm font-medium text-gray mb-1">
                {{ $t("deleteUserReason") }}
            </label>
            <textarea
                v-model="deleteReason"
                rows="3"
                :placeholder="$t('deleteUserReasonPlaceholder')"
                class="form-control mb-4 resize-none text-left"
            />
            <button
                @click="deleteUser"
                type="button"
                :disabled="deleteReason.trim() === ''"
                class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
            >
                {{ $t("deleteUser") }}
            </button>
        </ModalWindow>
    </div>
</template>
<script setup lang="ts">
const nuxtApp = useNuxtApp();

const deleteModal = ref(false);
const deleteReason = ref("");
const userList = ref([]);

// Clear the reason whenever the modal closes (delete, cancel or backdrop).
watch(deleteModal, (open) => {
    if (!open) deleteReason.value = "";
});

const { data: users } = await useFetch("/api/auth/admin/list");
if (users?.value?.users) {
    userList.value = users.value.users;
}

const deleteUser = async () => {
    try {
        const response = await $fetch("/api/auth/admin/delete", {
            method: "POST",
            body: {
                userId: deleteModal.value,
                reason: deleteReason.value,
            },
        });

        if (response.success) {
            // Remove the deleted user from the list
            userList.value = userList.value.filter(
                (user) => user.id !== deleteModal.value,
            );
            await nuxtApp.callHook("app:toast", {
                message: $t("userDeleted"),
            });
        } else {
            throw new Error(response.error || "Failed to delete user");
        }
    } catch (e) {
        let errorMessage = "Failed to delete user";
        if (e?.data?.error) {
            errorMessage = e.data.error;
        } else if (e?.message) {
            errorMessage = e.message;
        }

        await nuxtApp.callHook("app:toast", {
            message: errorMessage,
        });
    }

    deleteModal.value = false;
    document.body.style.overflow = "auto";
};
</script>
