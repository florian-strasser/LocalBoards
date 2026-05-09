<template>
    <div class="min-h-svh flex flex-col justify-between">
        <AppHeader />
        <ContentWrapper>
            <SectionHeader url="/new-user/" :tooltip="$t('newUser')">{{
                $t("users")
            }}</SectionHeader>
            <ContentBox>
                <UserList />
            </ContentBox>
        </ContentWrapper>
    </div>
</template>
<script setup lang="ts">
useHead({
    title: $t("users"),
});
</script>
