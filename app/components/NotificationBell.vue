<template>
    <div>
        <div class="relative">
            <div
                :class="{ 'opacity-0': unreadCount === 0 }"
                class="absolute top-0 right-0 size-2 transform translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary pointer-events-none z-20"
            ></div>
            <div
                :class="{ 'opacity-0': unreadCount === 0 }"
                class="absolute top-0 right-0 size-2 transform translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-secondary pointer-events-none z-20"
            ></div>
            <button
                @click="toggleNotifications"
                class="relative text-gray hover:text-primary-hover cursor-pointer block z-10"
                v-tooltip="$t('headerNotifications')"
            >
                <Bell class="size-5" />
            </button>
        </div>
        <div
            v-if="showNotifications"
            class="absolute right-0 mt-8 w-78 bg-white dark:bg-slate rounded-lg overflow-clip shadow-lg z-30"
        >
            <div class="p-4 border-b dark:border-gray/30">
                <h3 class="text-lg font-semibold">
                    {{ $t("headerNotifications") }}
                </h3>
            </div>
            <div class="max-h-96 overflow-y-auto">
                <NuxtLink
                    v-for="notification in notifications"
                    :key="notification.id"
                    :to="
                        notification.cardId
                            ? `/board/${notification.boardId}?card=${notification.cardId}`
                            : `/board/${notification.boardId}`
                    "
                    class="p-4 block w-full border-b dark:border-gray/30 hover:bg-black/10 dark:hover:bg-white/10"
                >
                    <div
                        class="text-sm"
                        v-html="sanitizeHtml(translateNotification(notification.message))"
                    />
                    <p class="text-xs text-gray-500 mt-1">
                        {{ formatDate(notification.createdAt) }}
                    </p>
                </NuxtLink>
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

const toggleNotifications = async () => {
    if (!showNotifications.value) {
        await fetchNotifications();
    }
    showNotifications.value = !showNotifications.value;
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
    // Explicit 2-digit day/month/hour/minute/second so localized formats keep
    // leading zeros (e.g. de-DE "03.07.2026, 02:09:00" instead of "3.7.2026").
    return date.toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

const translateNotification = (message: string): string => {
    // Handle card moved notification format: Card "name" moved from "area1" to "area2"
    if (
        message.startsWith('Card "') &&
        message.includes('" moved from "') &&
        message.includes('" to "')
    ) {
        // Extract the card name and areas
        const cardNameMatch = message.match(/Card "([^"]+)"/);
        const fromAreaMatch = message.match(/from "([^"]+)"/);
        const toAreaMatch = message.match(/to "([^"]+)"/);

        const cardName = cardNameMatch ? cardNameMatch[1] : "";
        const fromArea = fromAreaMatch ? fromAreaMatch[1] : "";
        const toArea = toAreaMatch ? toAreaMatch[1] : "";

        // Translate all static parts while preserving the format
        const cardPrefix = $t("notificationCardMoved");
        const movedFrom = $t("notificationCardMovedFrom");
        const movedTo = $t("notificationCardMovedTo");

        return `${cardPrefix} "${cardName}"${movedFrom}"${fromArea}"${movedTo}"${toArea}"`;
    }

    // Handle card status changed notification format: Card "name" status changed to completed/reopened
    if (
        message.startsWith('Card "') &&
        message.includes('" status changed to ')
    ) {
        // Extract the card name and status
        const cardNameMatch = message.match(/Card "([^"]+)"/);
        const statusMatch = message.match(
            /status changed to (completed|reopened)/,
        );

        const cardName = cardNameMatch ? cardNameMatch[1] : "";
        const status = statusMatch ? statusMatch[1] : "";

        // Translate all static parts while preserving the format
        const cardPrefix = $t("notificationCardStatusChanged");
        const statusChangedTo = $t("notificationCardStatusChangedTo");
        const translatedStatus =
            status === "completed"
                ? $t("notificationCardStatusCompleted")
                : $t("notificationCardStatusReopened");

        return `${cardPrefix} "${cardName}"${statusChangedTo}${translatedStatus}`;
    }
    // Handle new comment notification format: New comment by "username" on card "cardname"
    if (message.startsWith('New comment by "')) {
        // Extract the username and card name
        const usernameMatch = message.match(/New comment by "([^"]+)"/);
        const cardNameMatch = message.match(/on card "([^"]+)"/);

        const username = usernameMatch ? usernameMatch[1] : "";
        const cardName = cardNameMatch ? cardNameMatch[1] : "";

        // Extract everything after the card name as the comment
        const commentStartIndex =
            message.indexOf(`"${cardName}":`) + `"${cardName}":`.length;
        const comment = message.substring(commentStartIndex).trim();

        // Translate the static parts while preserving the format
        const translatedMessage = $t("notificationNewComment", {
            username: username,
        });

        return `${translatedMessage} "${cardName}":<div class='mt-2 rounded-md bg-dark/10 dark:bg-white/10 wysiwyg-wrapper px-4 py-3'>${comment}</div>`;
    }

    // Handle new card notification format: "username" created a new card "cardName" on board "boardName"
    if (message.includes(" created a new card ")) {
        const usernameMatch = message.match(/^"([^"]+)" created a new card/);
        const cardNameMatch = message.match(/created a new card "([^"]+)"/);
        const boardNameMatch = message.match(/on board "([^"]+)"$/);

        const username = usernameMatch ? usernameMatch[1] : "";
        const cardName = cardNameMatch ? cardNameMatch[1] : "";
        const boardName = boardNameMatch ? boardNameMatch[1] : "";

        return $t("notificationNewCard", { username, cardName, boardName });
    }

    // Handle old card notification format: New card created: cardName
    if (message.startsWith("New card created:")) {
        const cardName = message.slice("New card created:".length).trim();
        return $t("notificationNewCardOld", { cardName });
    }

    // Handle due-date reminder: Card "cardName" is due on <ISO date>
    if (message.startsWith('Card "') && message.includes('" is due on ')) {
        const cardNameMatch = message.match(/Card "([^"]+)"/);
        const dateMatch = message.match(/ is due on (.+)$/);
        const cardName = cardNameMatch ? cardNameMatch[1] : "";
        const dueIso = dateMatch ? dateMatch[1] : "";
        return $t("notificationCardDue", {
            cardName,
            date: dueIso ? formatDate(dueIso) : "",
        });
    }

    // Handle card assignment: "username" assigned you the card "cardName"
    if (message.includes(" assigned you the card ")) {
        const usernameMatch = message.match(/^"([^"]+)" assigned you the card/);
        const cardNameMatch = message.match(/assigned you the card "([^"]+)"/);
        const username = usernameMatch ? usernameMatch[1] : "";
        const cardName = cardNameMatch ? cardNameMatch[1] : "";
        return $t("notificationCardAssigned", { username, cardName });
    }

    // Map the static part to a translation key
    const translationKeyMap = {
        "You have been invited to the board": "notificationInvitedToBoard",
        "New comment on card": "notificationNewComment",
    };

    // Extract the static part of the message for other notification types
    const staticPart = Object.keys(translationKeyMap).find((key) =>
        message.startsWith(key),
    );

    // Get the translation key
    const translationKey = translationKeyMap[staticPart];

    if (translationKey) {
        // Replace the static part with the translated text
        const dynamicPart = message.slice(staticPart.length).trim();
        return `${$t(translationKey)} ${dynamicPart}`;
    } else {
        // Fallback to the original message if no translation is found
        return message;
    }
};

await fetchNotifications();
</script>
