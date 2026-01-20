<template>
    <div class="min-h-screen flex flex-col justify-between">
        <AppHeader />
        <ContentWrapper>
            <h1 class="text-5xl text-primary dark:text-white mb-8">
                {{ $t("editUser") }}
            </h1>
            <EditUserForm :id="userID" />
            <h2 class="text-4xl text-primary dark:text-white mt-16 mb-8">
                {{ $t("changePassword") }}
            </h2>
            <EditUserPassword :id="userID" />
        </ContentWrapper>
        <AppFooter />
    </div>
</template>
<script setup lang="ts">
const route = useRoute();
const userID = route.params.id;

useHead({
    title: $t("editUser"),
});
</script>
