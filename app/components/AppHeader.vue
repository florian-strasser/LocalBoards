<script setup lang="ts">
import { UsersRound, LogOut, UserRoundPen } from "lucide-vue-next";
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
    <header v-if="session" class="w-full pt-6">
        <div class="container mx-auto flex justify-between items-center">
            <NuxtLinkLocale
                to="/dashboard/"
                class="text-primary hover:text-secondary cursor-pointer block"
            >
                <Logo />
            </NuxtLinkLocale>
            <ul
                class="flex gap-x-4 menu app-nav px-6 py-4 rounded-full bg-white"
            >
                <li>
                    <NotificationBell :userID="session.user.id" />
                </li>
                <li v-if="session.user.role === 'admin'">
                    <NuxtLinkLocale
                        to="/users/"
                        class="text-gray hover:text-secondary cursor-pointer block"
                        v-tooltip="$t('headerUsers')"
                    >
                        <UsersRound class="size-5" />
                    </NuxtLinkLocale>
                </li>
                <li>
                    <NuxtLinkLocale
                        to="/settings/"
                        class="text-gray hover:text-secondary cursor-pointer block"
                        v-tooltip="$t('headerSettings')"
                    >
                        <UserRoundPen class="size-5" />
                    </NuxtLinkLocale>
                </li>
                <li>
                    <button
                        @click="handleLogout"
                        class="text-gray hover:text-secondary cursor-pointer block"
                        v-tooltip="$t('headerLogout')"
                    >
                        <LogOut class="size-5" />
                    </button>
                </li>
            </ul>
        </div>
    </header>
</template>
