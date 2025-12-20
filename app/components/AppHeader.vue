<script setup lang="ts">
import { authClient } from "@/lib/auth-client";

const relativeFetch = ((url: string, opts?: any) => {
    try {
        if (url.startsWith("http")) url = new URL(url).pathname;
    } catch {}
    return useFetch(url, opts);
}) as any;

const { data: session } = await authClient.useSession(relativeFetch);
const handleLogout = async () => {
    await authClient.signOut();
    await navigateTo("/");
};
</script>
<template>
    <header v-if="session" class="w-full pt-5">
        <div class="container mx-auto flex justify-between items-center">
            <NuxtLink
                to="/dashboard/"
                class="text-primary hover:text-secondary"
            >
                <Logo />
            </NuxtLink>
            <ul class="flex gap-x-4 menu app-nav">
                <li>
                    <NuxtLink to="/dashboard/" class="py-1 block"
                        >Dashboard</NuxtLink
                    >
                </li>
                <li v-if="session.user.role == 'admin'">
                    <NuxtLink to="/users/" class="py-1 block">Users</NuxtLink>
                </li>
                <li>
                    <NuxtLink to="/settings/" class="py-1 block"
                        >Settings</NuxtLink
                    >
                </li>
                <li>
                    <button
                        @click="handleLogout"
                        class="text-gray hover:text-secondary cursor-pointer py-1 block"
                    >
                        Sign out
                    </button>
                </li>
            </ul>
        </div>
    </header>
</template>
<style scoped>
.menu a {
    color: var(--color-gray);
    border-bottom: 1px transparent solid;
}
.menu a:hover {
    color: var(--color-secondary);
}
.menu a.router-link-exact-active {
    color: var(--color-secondary);
    border-bottom: 1px var(--color-secondary) solid;
}
</style>
