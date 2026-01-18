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
            <h2 class="text-4xl text-primary mb-6">
                {{ $t("deleteUserMessage") }}
            </h2>
            <button
                @click="deleteUser"
                type="button"
                class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
            >
                {{ $t("deleteUser") }}
            </button>
        </ModalWindow>
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";

const nuxtApp = useNuxtApp();

const deleteModal = ref(false);
const userList = ref([]);

const { data: users } = await useFetch("/api/auth/admin/list-users");
if (users && users.value.users) {
    userList.value = users.value.users;
}

const deleteUser = async () => {
    const { data: deletedUser, error } = await authClient.admin.removeUser({
        userId: deleteModal.value,
    });

    if (!error) {
        // Remove the deleted user from the list
        userList.value = userList.value.filter(
            (user) => user.id !== deleteModal.value,
        );
        await nuxtApp.callHook("app:toast", {
            message: $t("userDeleted"),
        });
    }

    deleteModal.value = false;
};
</script>
