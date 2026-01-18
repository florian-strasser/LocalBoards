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
    notificationCardMoved: "Card",
    notificationCardMovedFrom: " moved from ",
    notificationCardMovedTo: " to ",
    notificationCardStatusChanged: "Card",
    notificationCardStatusChangedTo: " status changed to ",
    notificationCardStatusCompleted: "completed",
    notificationCardStatusReopened: "reopened",
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
    notificationCardMoved: "Karte",
    notificationCardMovedFrom: " bewegt von ",
    notificationCardMovedTo: " nach ",
    notificationCardStatusChanged: "Karte",
    notificationCardStatusChangedTo: " Status geändert zu ",
    notificationCardStatusCompleted: "abgeschlossen",
    notificationCardStatusReopened: "wiedereröffnet",
  },
  fr: {
    youHaveUnreadNotifications: "Vous avez des notifications non lues",
    youHaveTheFollowingUnreadNotifications:
      "Vous avez les notifications non lues suivantes",
    clickHereToViewYourNotifications: "Cliquez ici pour voir vos notifications",
    notificationInvitedToBoard: "Vous avez été invité au tableau :",
    notificationNewComment: "Nouveau commentaire sur la carte :",
    notificationNewCard: "Nouvelle carte créée :",
    notificationCardMoved: "Carte",
    notificationCardMovedFrom: " déplacée de ",
    notificationCardMovedTo: " à ",
    notificationCardStatusChanged: "Carte",
    notificationCardStatusChangedTo: " statut changé à ",
    notificationCardStatusCompleted: "terminé",
    notificationCardStatusReopened: "rouvert",
  },
  es: {
    youHaveUnreadNotifications: "Tienes notificaciones no leídas",
    youHaveTheFollowingUnreadNotifications:
      "Tienes las siguientes notificaciones no leídas",
    clickHereToViewYourNotifications:
      "Haz clic aquí para ver tus notificaciones",
    notificationInvitedToBoard: "Has sido invitado al tablero:",
    notificationNewComment: "Nuevo comentario en la tarjeta:",
    notificationNewCard: "Nueva tarjeta creada:",
    notificationCardMoved: "Tarjeta",
    notificationCardMovedFrom: " movida de ",
    notificationCardMovedTo: " a ",
    notificationCardStatusChanged: "Tarjeta",
    notificationCardStatusChangedTo: " estado cambiado a ",
    notificationCardStatusCompleted: "completado",
    notificationCardStatusReopened: "reabierto",
  },
  it: {
    youHaveUnreadNotifications: "Hai notifiche non lette",
    youHaveTheFollowingUnreadNotifications:
      "Hai le seguenti notifiche non lette",
    clickHereToViewYourNotifications: "Clicca qui per vedere le tue notifiche",
    notificationInvitedToBoard: "Sei stato invitato alla bacheca:",
    notificationNewComment: "Nuovo commento sulla carta:",
    notificationNewCard: "Nuova carta creata:",
    notificationCardMoved: "Carta",
    notificationCardMovedFrom: " spostata da ",
    notificationCardMovedTo: " a ",
    notificationCardStatusChanged: "Carta",
    notificationCardStatusChangedTo: " stato cambiato a ",
    notificationCardStatusCompleted: "completato",
    notificationCardStatusReopened: "riaperto",
  },
  nl: {
    youHaveUnreadNotifications: "Je hebt ongelezen meldingen",
    youHaveTheFollowingUnreadNotifications:
      "Je hebt de volgende ongelezen meldingen",
    clickHereToViewYourNotifications: "Klik hier om je meldingen te bekijken",
    notificationInvitedToBoard: "Je bent uitgenodigd voor het bord:",
    notificationNewComment: "Nieuwe reactie op kaart:",
    notificationNewCard: "Nieuwe kaart gemaakt:",
    notificationCardMoved: "Kaart",
    notificationCardMovedFrom: " verplaatst van ",
    notificationCardMovedTo: " naar ",
    notificationCardStatusChanged: "Kaart",
    notificationCardStatusChangedTo: " status gewijzigd naar ",
    notificationCardStatusCompleted: "voltooid",
    notificationCardStatusReopened: "heropend",
  },
  pl: {
    youHaveUnreadNotifications: "Masz nieprzeczytane powiadomienia",
    youHaveTheFollowingUnreadNotifications:
      "Masz następujące nieprzeczytane powiadomienia",
    clickHereToViewYourNotifications:
      "Kliknij tutaj, aby zobaczyć swoje powiadomienia",
    notificationInvitedToBoard: "Zostałeś zaproszony do tablicy:",
    notificationNewComment: "Nowy komentarz do karty:",
    notificationNewCard: "Nowa karta utworzona:",
    notificationCardMoved: "Karta",
    notificationCardMovedFrom: " przeniesiona z ",
    notificationCardMovedTo: " do ",
    notificationCardStatusChanged: "Karta",
    notificationCardStatusChangedTo: " status zmieniony na ",
    notificationCardStatusCompleted: "ukończono",
    notificationCardStatusReopened: "ponownie otwarto",
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
    return `${cardPrefix} "${cardName}"${movedFrom}"${fromArea}"${movedTo}"${toArea}"`;
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
    return `${cardPrefix} "${cardName}"${statusChangedTo}${translatedStatus}`;
  }

  // Extract the static part of the message for other notification types
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
