<template>
    <div>
        <SectionHeader url="/new-user/">Users</SectionHeader>
        <ContentBox>
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
                        Do you want to delete this user?
                    </h2>
                    <button
                        @click="deleteUser"
                        type="button"
                        class="button bg-primary hover:bg-secondary w-full text-center px-6 py-3 rounded-lg text-white cursor-pointer"
                    >
                        Delete User
                    </button>
                </ModalWindow>
            </div>
        </ContentBox>
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";

const relativeFetch = ((url: string, opts?: any) => {
    try {
        if (url.startsWith("http")) url = new URL(url).pathname;
    } catch {}
    return useFetch(url, opts);
}) as any;

const deleteModal = ref(false);
const userList = ref([]);

const { data: users, error } = await useFetch("/api/auth/admin/list-users");
// const { data: users, error } = authClient.admin.listUsers(relativeFetch);

if (users && users.users) {
    userList.value = users.users;
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
    }

    deleteModal.value = false;
};
</script>
