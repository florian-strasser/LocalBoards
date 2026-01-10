<template>
    <div class="min-h-screen flex flex-col justify-between">
        <AppHeader />
        <ContentWrapper>
            <h1 class="text-5xl text-primary mb-8">
                {{ $t("createANewUser") }}
            </h1>
            <NewUserForm />
        </ContentWrapper>
        <AppFooter />
    </div>
</template>
<script setup lang="ts">
useHead({
    title: $t("createANewUser"),
});
</script>
