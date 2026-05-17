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
    notificationInvitedToBoard: "You have been invited to the board",
    notificationNewComment: 'New comment by "{username}" on card:',
    notificationNewCard:
      '"{username}" created a new card "{cardName}" on board "{boardName}"',
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
    notificationNewComment: 'Neuer Kommentar von "{username}" auf Karte',
    notificationNewCard:
      '"{username}" hat eine neue Karte "{cardName}" auf dem Board "{boardName}" erstellt',
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
    notificationInvitedToBoard: "Vous avez été invité au tableau",
    notificationNewComment:
      'Nouveau commentaire de "{username}" sur la carte :',
    notificationNewCard:
      '"{username}" a créé une nouvelle carte "{cardName}" sur le tableau "{boardName}"',
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
    notificationInvitedToBoard: "Has sido invitado al tablero",
    notificationNewComment: 'Nuevo comentario de "{username}" en la tarjeta:',
    notificationNewCard:
      '"{username}" creó una nueva tarjeta "{cardName}" en el tablero "{boardName}"',
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
    notificationInvitedToBoard: "Sei stato invitato alla bacheca",
    notificationNewComment: 'Nuovo commento di "{username}" sulla carta:',
    notificationNewCard:
      '"{username}" ha creato una nuova carta "{cardName}" sulla bacheca "{boardName}"',
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
    notificationInvitedToBoard: "Je bent uitgenodigd voor het bord",
    notificationNewComment: 'Nieuwe reactie van "{username}" op kaart:',
    notificationNewCard:
      '"{username}" heeft een nieuwe kaart "{cardName}" gemaakt op het bord "{boardName}"',
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
    notificationInvitedToBoard: "Zostałeś zaproszony do tablicy",
    notificationNewComment: 'Nowy komentarz od "{username}" do karty:',
    notificationNewCard:
      '"{username}" utworzył nową kartę "{cardName}" na tablicy "{boardName}"',
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
      const notificationMessages = userNotifications.map((notification) => {
        return `<li style='margin-bottom:0.4em; padding:0.8em 1.5em 0.33em 1.5em; background:rgba(0,0,0,0.1); border-radius:0.5em;'>${translateNotification(notification.message)}</li>`;
      });

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
  run({ payload }) {
    console.log("Check if a mail should be sent for an unread notification");
    sendNotification();
  },
});
