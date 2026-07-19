// server/tasks/notification.ts
import { setupDatabase } from "~/lib/databaseSetup";
import { sendEmail } from "~/lib/sendEmail";
import enLocale from "../../i18n/locales/en.json";
import deLocale from "../../i18n/locales/de.json";
import frLocale from "../../i18n/locales/fr.json";
import esLocale from "../../i18n/locales/es.json";
import itLocale from "../../i18n/locales/it.json";
import nlLocale from "../../i18n/locales/nl.json";
import plLocale from "../../i18n/locales/pl.json";

const runtimeConfig = useRuntimeConfig();

const appName = runtimeConfig.appName;
const baseURL = runtimeConfig.boardsUrl;

const language = runtimeConfig.language;

// Notification/email strings come from the app's i18n locale files, so there is
// one source of truth for translations (shared with the UI).
const textList: Record<string, Record<string, string>> = {
  en: enLocale,
  de: deLocale,
  fr: frLocale,
  es: esLocale,
  it: itLocale,
  nl: nlLocale,
  pl: plLocale,
};

const dateLocales: Record<string, string> = {
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  nl: "nl-NL",
  pl: "pl-PL",
};

const formatDueDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString(dateLocales[language] || "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
};

const translateText = (text: string): string => {
  const languageTexts = textList[language] || textList.en; // Fallback to English
  const translatedText = languageTexts?.[text];
  if (!translatedText) {
    logger.warn(`Translation for key "${text}" not found.`);
    return text; // Return the original text as a fallback
  }
  return translatedText;
};

const buildTitle = (title) => {
  return title + " | " + appName;
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
    const cardPrefix = translateText("notificationCardMoved");
    const movedFrom = translateText("notificationCardMovedFrom");
    const movedTo = translateText("notificationCardMovedTo");
    return `<p>${cardPrefix} "${cardName}"${movedFrom}"${fromArea}"${movedTo}"${toArea}"</p>`;
  }

  // Handle card status changed notification format: Card "name" status changed to completed/reopened
  if (
    message.startsWith('Card "') &&
    message.includes('" status changed to ')
  ) {
    // Extract the card name and status
    const cardNameMatch = message.match(/Card "([^"]+)"/);
    const statusMatch = message.match(/status changed to (completed|reopened)/);

    const cardName = cardNameMatch ? cardNameMatch[1] : "";
    const status = statusMatch ? statusMatch[1] : "";

    // Translate all static parts while preserving the format
    const cardPrefix = translateText("notificationCardStatusChanged");
    const statusChangedTo = translateText("notificationCardStatusChangedTo");
    const translatedStatus =
      status === "completed"
        ? translateText("notificationCardStatusCompleted")
        : translateText("notificationCardStatusReopened");
    return `<p>${cardPrefix} "${cardName}"${statusChangedTo}${translatedStatus}</p>`;
  }

  // Handle new card notification format: "username" created a new card "cardName" on board "boardName"
  if (message.includes(" created a new card ")) {
    const usernameMatch = message.match(/^"([^"]+)" created a new card/);
    const cardNameMatch = message.match(/created a new card "([^"]+)"/);
    const boardNameMatch = message.match(/on board "([^"]+)"$/);

    const username = usernameMatch ? usernameMatch[1] : "";
    const cardName = cardNameMatch ? cardNameMatch[1] : "";
    const boardName = boardNameMatch ? boardNameMatch[1] : "";

    const translatedMessage = translateText("notificationNewCard");
    return `<p>${translatedMessage.replace("{username}", username).replace("{cardName}", cardName).replace("{boardName}", boardName)}</p>`;
  }

  // Handle old card notification format: New card created: cardName
  if (message.startsWith("New card created:")) {
    const cardName = message.slice("New card created:".length).trim();
    return `<p>${translateText("notificationNewCard")}</p><p>${cardName}</p>`;
  }

  // Handle due-date reminder: Card "cardName" is due on <ISO date>
  if (message.startsWith('Card "') && message.includes('" is due on ')) {
    const cardName = (message.match(/Card "([^"]+)"/) || [])[1] || "";
    const dueIso = (message.match(/ is due on (.+)$/) || [])[1] || "";
    const text = translateText("notificationCardDue")
      .replace("{cardName}", cardName)
      .replace("{date}", dueIso ? formatDueDate(dueIso) : "");
    return `<p>${text}</p>`;
  }

  // Handle card assignment: "username" assigned you the card "cardName"
  if (message.includes(" assigned you the card ")) {
    const username =
      (message.match(/^"([^"]+)" assigned you the card/) || [])[1] || "";
    const cardName =
      (message.match(/assigned you the card "([^"]+)"/) || [])[1] || "";
    const text = translateText("notificationCardAssigned")
      .replace("{username}", username)
      .replace("{cardName}", cardName);
    return `<p>${text}</p>`;
  }

  // Map the static part to a translation key
  const translationKeyMap = {
    "You have been invited to the board": "notificationInvitedToBoard",
    'New comment by "': "notificationNewComment",
  };

  // Extract the static part of the message for other notification types
  const staticPart = Object.keys(translationKeyMap).find((key) =>
    message.startsWith(key),
  );

  // Get the translation key
  const translationKey = translationKeyMap[staticPart];

  if (translationKey) {
    // Handle new comment notification format: New comment by "username" on card "cardname"
    if (translationKey === "notificationNewComment") {
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
      const translatedMessage = translateText("notificationNewComment");
      return `<p>${translatedMessage.replace("{username}", username)} "${cardName}":</p><div class="comment">${comment.replace(/<img src="/g, '<img src="' + baseURL).replace(/<img/g, '<img style="max-width:100%; display:block;"')}</div>`;
    } else {
      // Replace the static part with the translated text
      const dynamicPart = message.slice(staticPart.length).trim();
      return `${translateText(translationKey)}: ${dynamicPart}`;
    }
  } else {
    // Fallback to the original message if no translation is found
    return message;
  }
};

const sendNotification = async () => {
  try {
    const db = setupDatabase();
    // Fetch notifications that still need an email: not yet emailed and not yet
    // seen by the user. (`isRead` now means "the user has viewed it", so anything
    // already opened is skipped; `notified` tracks what's already been emailed.)
    const [rows] = await db.execute(
      "SELECT * FROM notifications WHERE isRead = FALSE AND notified = FALSE",
    );

    const notifications = rows as Array<{
      id: number;
      userId: string;
      type: string;
      boardId: number;
      cardId: number;
      message: string;
      isRead: boolean;
      createdAt: string;
    }>;

    // Group notifications by user
    const notificationsByUser = notifications.reduce(
      (acc, notification) => {
        if (!acc[notification.userId]) {
          acc[notification.userId] = [];
        }
        acc[notification.userId].push(notification);
        return acc;
      },
      {} as Record<string, typeof notifications>,
    );

    // Send an email for each user with unread notifications
    for (const userId of Object.keys(notificationsByUser)) {
      const userNotifications = notificationsByUser[userId];
      const notificationMessages = userNotifications.map((notification) => {
        return `<li style='margin-bottom:0.4em; padding:0.8em 1.5em 0.33em 1.5em; background:rgba(0,0,0,0.1); border-radius:0.5em;'>${translateNotification(notification.message)}</li>`;
      });

      // Fetch the user's email address — only for accounts that still want
      // notification mails (opt-out lives on the profile; artificial/AI
      // accounts default to off).
      const [userRows] = await db.execute(
        "SELECT email FROM user WHERE id = ? AND emailNotifications = 1",
        [userId],
      );
      const userEmail = userRows[0]?.email;

      if (userEmail) {
        await sendEmail({
          to: userEmail,
          subject: buildTitle(translateText("youHaveUnreadNotifications")),
          text:
            "<p>" +
            translateText("youHaveTheFollowingUnreadNotifications") +
            ":</p><ul style='list-style:none; padding-left:0;'>" +
            notificationMessages.join("") +
            "</ul><p>" +
            translateText("clickHereToViewYourNotifications") +
            ":</p><p><a href='" +
            baseURL +
            "/dashboard/" +
            "'>" +
            baseURL +
            "/dashboard/" +
            "</a></p>",
        });

        // Mark the emailed notifications as notified (not read) so they aren't
        // re-sent. `isRead` is left untouched — it only flips when the user
        // actually opens the card/board.
        const emailedIds = userNotifications.map((n) => n.id);
        const idPlaceholders = emailedIds.map(() => "?").join(",");
        await db.execute(
          `UPDATE notifications SET notified = TRUE WHERE id IN (${idPlaceholders})`,
          emailedIds,
        );
      } else {
        logger.error(
          `User with ID ${userId} not found or has no email address`,
        );
      }
    }

    return { result: "Success" };
  } catch (error) {
    logger.error("Error sending notification emails:", error);
    return { result: "Internal server error" };
  }
};

export default defineTask({
  meta: {
    name: "notification",
    description: "Send Email for notifications if necessary",
  },
  run({ payload }) {
    logger.debug("Check if a mail should be sent for an unread notification");
    sendNotification();
  },
});
