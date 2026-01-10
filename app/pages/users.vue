<template>
    <div class="min-h-screen flex flex-col justify-between">
        <AppHeader />
        <ContentWrapper>
            <SectionHeader url="/new-user/" :tooltip="$t('newUser')">{{
                $t("users")
            }}</SectionHeader>
            <ContentBox>
                <UserList />
            </ContentBox>
        </ContentWrapper>
        <AppFooter />
    </div>
</template>
<script setup lang="ts">
useHead({
    title: $t("users"),
});
</script>
