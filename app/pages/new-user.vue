<template>
    <div class="min-h-svh flex flex-col justify-between">
        <AppHeader />
        <ContentWrapper>
            <h1 class="text-3xl sm:text-5xl text-dark dark:text-white mb-8">
                {{ $t("createANewUser") }}
            </h1>
            <NewUserForm />
        </ContentWrapper>
    </div>
</template>
<script setup lang="ts">
useHead({
    title: $t("createANewUser"),
});
</script>
