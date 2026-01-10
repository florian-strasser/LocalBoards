// server/tasks/notification.ts
import { setupDatabase } from "~/lib/databaseSetup";
import { sendEmail } from "~/lib/sendEmail";

const runtimeConfig = useRuntimeConfig();

const appName = runtimeConfig.appName;
const baseURL = runtimeConfig.boardsUrl;

const language = runtimeConfig.language;

const textList = {
  en: {
    youHaveUnreadNotifications: "You have unread notifications",
    youHaveTheFollowingUnreadNotifications:
      "You have the following unread notifications",
    clickHereToViewYourNotifications: "Click here to view your notifications",
    notificationInvitedToBoard: "You have been invited to the board:",
    notificationNewComment: "New comment on card:",
    notificationNewCard: "New card created:",
  },
  de: {
    youHaveUnreadNotifications: "Du hast ungelesene Benachrichtigungen",
    youHaveTheFollowingUnreadNotifications:
      "Du hast folgende ungelesene Benachrichtigungen",
    clickHereToViewYourNotifications:
      "Klicke hier, um deine Benachrichtigungen anzuzeigen",
    notificationInvitedToBoard: "Du wurdest zum Board eingeladen",
    notificationNewComment: "Neuer Kommentar auf Karte",
    notificationNewCard: "Neue Karte erstellt",
  },
};

const translateText = (text: string): string => {
  const languageTexts = textList[language] || textList.en; // Fallback to English
  const translatedText = languageTexts?.[text];
  if (!translatedText) {
    console.warn(`Translation for key "${text}" not found.`);
    return text; // Return the original text as a fallback
  }
  return translatedText;
};

const buildTitle = (title) => {
  return title + " | " + appName;
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
    return `${translateText(translationKey)}: ${dynamicPart}`;
  } else {
    // Fallback to the original message if no translation is found
    return message;
  }
};

const sendNotification = async () => {
  try {
    const db = setupDatabase();
    // Fetch all unread notifications
    const [rows] = await db.execute(
      "SELECT * FROM notifications WHERE isRead = FALSE",
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
      const notificationMessages = userNotifications
        .map((notification) => {
          return `- ${translateNotification(notification.message)}`;
        })
        .join("\n");

      // Fetch the user's email address from the user table
      const [userRows] = await db.execute(
        "SELECT email FROM user WHERE id = ?",
        [userId],
      );
      const userEmail = userRows[0]?.email;

      if (userEmail) {
        await sendEmail({
          to: userEmail,
          subject: buildTitle(translateText("youHaveUnreadNotifications")),
          text:
            translateText("youHaveTheFollowingUnreadNotifications") +
            ":\n\n" +
            notificationMessages +
            "\n\n" +
            translateText("clickHereToViewYourNotifications") +
            ": " +
            baseURL +
            "/dashboard/",
        });

        // Mark notifications as read after sending the email
        await db.execute(
          "UPDATE notifications SET isRead = TRUE WHERE userId = ?",
          [userId],
        );
      } else {
        console.error(
          `User with ID ${userId} not found or has no email address`,
        );
      }
    }

    return { result: "Success" };
  } catch (error) {
    console.error("Error sending notification emails:", error);
    return { result: "Internal server error" };
  }
};

export default defineTask({
  meta: {
    name: "notification",
    description: "Send Email for notifications if necessary",
  },
  run({ payload, context }) {
    console.log("Check if a mail should be sent for an unread notification");
    sendNotification();
  },
});
