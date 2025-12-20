<template>
    <div class="min-h-screen flex flex-col justify-between">
        <AppHeader />
        <ContentWrapper>
            <h1 class="text-5xl text-primary mb-8">Edit user</h1>
            <EditUserForm
                v-if="userData"
                :email="userData.users[0].email"
                :username="userData.users[0].username"
                :id="userID"
            />
            <h2 class="text-4xl text-primary mt-16 mb-8">Change password</h2>
            <EditUserPassword :id="userID" />
        </ContentWrapper>
        <AppFooter />
    </div>
</template>
<script setup lang="ts">
import { authClient } from "@/lib/auth-client";
const route = useRoute();
const userID = route.params.id;
const { data: userData, error } = await authClient.admin.listUsers({
    query: {
        limit: 1,
        filterField: "id",
        filterValue: userID,
        filterOperator: "eq",
    },
});
</script>
