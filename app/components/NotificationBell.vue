<template>
    <div class="relative">
        <button
            @click="toggleNotifications"
            class="relative text-gray hover:text-secondary cursor-pointer block"
            v-tooltip="$t('headerNotifications')"
        >
            <Bell class="size-5" />
            <span
                v-if="unreadCount > 0"
                class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full size-4 flex items-center justify-center"
            >
                {{ unreadCount }}
            </span>
        </button>
        <div
            v-if="showNotifications"
            class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50"
        >
            <div class="p-4 border-b">
                <h3 class="text-lg font-semibold">
                    {{ $t("headerNotifications") }}
                </h3>
            </div>
            <div class="max-h-96 overflow-y-auto">
                <div
                    v-for="notification in notifications"
                    :key="notification.id"
                    class="p-4 border-b hover:bg-gray-50"
                    :class="{ 'bg-gray-100': !notification.isRead }"
                >
                    <p class="text-sm">
                        {{ translateNotification(notification.message) }}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                        {{ formatDate(notification.createdAt) }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Bell } from "lucide-vue-next";

const props = defineProps({
    userID: String,
});

const showNotifications = ref(false);
const notifications = ref([]);
const unreadCount = ref(0);

const toggleNotifications = () => {
    showNotifications.value = !showNotifications.value;
    if (showNotifications.value) {
        fetchNotifications();
    }
};

const fetchNotifications = async () => {
    try {
        const { data, error } = await useFetch(
            `/api/data/notifications?userId=${props.userID}`,
        );
        if (error.value) {
            console.error("Error fetching notifications:", error.value);
        } else if (data.value?.notifications) {
            notifications.value = data.value.notifications;
            unreadCount.value = notifications.value.filter(
                (n) => !n.isRead,
            ).length;
        }
    } catch (err) {
        console.error("Error:", err);
    }
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
};

const translateNotification = (message: string): string => {
    // Extract the static part of the message
    const staticPart = message.split(":")[0];

    // Map the static part to a translation key
    const translationKeyMap = {
        "You have been invited to the board": "notificationInvitedToBoard",
        "New comment on card": "notificationNewComment",
        "New card created": "notificationNewCard",
    };

    // Get the translation key
    const translationKey = translationKeyMap[staticPart];

    if (translationKey) {
        // Replace the static part with the translated text
        const dynamicPart = message.split(":").slice(1);
        return `${$t(translationKey)}: ${dynamicPart}`;
    } else {
        // Fallback to the original message if no translation is found
        return message;
    }
};

onMounted(() => {
    fetchNotifications();
});
</script>
