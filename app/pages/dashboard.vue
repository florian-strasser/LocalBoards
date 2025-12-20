<template>
    <div class="min-h-screen flex flex-col justify-between">
        <AppHeader />
        <ContentWrapper>
            <SectionHeader url="/board/new/">Your Boards</SectionHeader>
            <YourBoards v-if="session" :userID="session.user.id" />
            <h2 class="text-5xl text-primary mt-16">Shared Boards</h2>
            <div v-if="session && session.user.role === 'admin'" class="mt-12">
                Information you only want to show to the admin
            </div>
        </ContentWrapper>
        <AppFooter />
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

const { data: session } = await authClient.useSession(relativeFetch);
</script>
