<template>
    <div class="min-h-svh flex flex-col justify-between">
        <AppHeader />
        <ContentWrapper>
            <SectionHeader>{{ $t("settingsYourAccount") }}</SectionHeader>
            <SettingsForm />
            <h2 class="text-5xl text-dark dark:text-white mt-12 mb-5">
                {{ $t("settingsChangePassword") }}
            </h2>
            <PasswordForm />
            <ApiList />
        </ContentWrapper>
    </div>
</template>
<script setup lang="ts">
useHead({
    title: $t("settings"),
});
</script>
