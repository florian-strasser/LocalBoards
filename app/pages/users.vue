<template>
    <div class="min-h-screen flex flex-col justify-between">
        <AppHeader />
        <ContentWrapper>
            <UserList />
        </ContentWrapper>
        <AppFooter />
    </div>
</template>
<script setup lang="ts">
useHead({
    title: $t("users"),
});
</script>
