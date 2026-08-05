<script setup lang="ts">
import { UsersRound, LogOut, UserRoundPen } from "lucide-vue-next";

const { data: session } = await useFetch("/api/auth/get-session");
const handleLogout = async () => {
    await useFetch("/api/auth/sign-out", { method: "POST" });
    await navigateTo("/");
};
</script>
<template>
    <ImpersonationBanner />
    <header v-if="session" class="w-full pt-6">
        <div
            class="container mx-auto flex flex-wrap items-center justify-between gap-y-3"
        >
            <NuxtLinkLocale
                to="/dashboard/"
                class="text-primary hover:text-primary-hover cursor-pointer block"
            >
                <Logo />
            </NuxtLinkLocale>
            <!-- Search sits between the logo and the nav: a field you can type
                 in straight away, not another icon competing with the actions
                 in the pill. It takes the leftover width up to a readable
                 maximum; on a phone there isn't enough room beside the nav, so
                 it wraps to its own full-width line underneath. -->
            <GlobalSearch
                class="order-last w-full sm:order-none sm:mx-8 sm:w-auto sm:min-w-0 sm:max-w-md sm:flex-1"
            />
            <ul
                class="relative flex gap-x-4 menu app-nav px-6 py-4 rounded-full bg-white dark:bg-slate"
            >
                <li>
                    <NotificationBell :userID="session.data.user.id" />
                </li>
                <li v-if="session.data.user.role === 'admin'">
                    <NuxtLinkLocale
                        to="/users/"
                        class="text-gray hover:text-primary-hover cursor-pointer block"
                        v-tooltip="$t('headerUsers')"
                    >
                        <UsersRound class="size-5" />
                    </NuxtLinkLocale>
                </li>
                <li>
                    <NuxtLinkLocale
                        to="/settings/"
                        class="text-gray hover:text-primary-hover cursor-pointer block"
                        v-tooltip="$t('headerSettings')"
                    >
                        <UserRoundPen class="size-5" />
                    </NuxtLinkLocale>
                </li>
                <li>
                    <button
                        @click="handleLogout"
                        class="text-gray hover:text-primary-hover cursor-pointer block"
                        v-tooltip="$t('headerLogout')"
                    >
                        <LogOut class="size-5" />
                    </button>
                </li>
            </ul>
        </div>
    </header>
</template>
