// server/tasks/notification.ts
import { setupDatabase } from "~/lib/databaseSetup";
import { sendEmail } from "~/lib/sendEmail";
import {
  EMAIL_FONT,
  EMAIL_PRIMARY,
  emailButton,
  emailLayout,
  emailParagraph,
  escapeEmailHtml,
} from "../utils/emailLayout";
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

const formatDate = (iso: string): string => {
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

// Same interpolation the UI uses: `{name}` placeholders in the locale strings.
const t = (key: string, params: Record<string, string> = {}): string => {
  let out = translateText(key);
  for (const [k, v] of Object.entries(params)) out = out.split(`{${k}}`).join(v);
  return out;
};

const buildTitle = (title) => {
  return title + " | " + appName;
};

// The shell, button and escaping are shared with every other e-mail —
// see utils/emailLayout.ts.
const esc = escapeEmailHtml;
const FONT = EMAIL_FONT;
const PRIMARY = EMAIL_PRIMARY;
const AVATAR = 36; // px — the text line-height (18px) is exactly half of it, so
// one line centres against the avatar and two lines fill it top to bottom.

// Turn a stored notification message into the same shape the card's activity
// timeline shows: an actor-led sentence ("… moved "Card" from "A" to "B""), plus
// an optional body that gets its own bubble (currently only comments have one).
const describeNotification = (
  message: string,
): { text: string; body: string } => {
  const plain = (text: string) => ({ text, body: "" });

  // Card "name" moved from "area1" to "area2"
  if (
    message.startsWith('Card "') &&
    message.includes('" moved from "') &&
    message.includes('" to "')
  ) {
    return plain(
      t("notifMovedCard", {
        cardName: (message.match(/Card "([^"]*)"/) || [])[1] || "",
        from: (message.match(/from "([^"]*)"/) || [])[1] || "",
        to: (message.match(/to "([^"]*)"/) || [])[1] || "",
      }),
    );
  }

  // Card "name" status changed to completed/reopened
  if (message.startsWith('Card "') && message.includes('" status changed to ')) {
    const cardName = (message.match(/Card "([^"]*)"/) || [])[1] || "";
    const completed = message.includes("status changed to completed");
    return plain(
      t(completed ? "notifCompletedCard" : "notifReopenedCard", { cardName }),
    );
  }

  // "username" created a new card "cardName" on board "boardName"
  if (message.includes(" created a new card ")) {
    return plain(
      t("notifCreatedCard", {
        cardName: (message.match(/created a new card "([^"]*)"/) || [])[1] || "",
      }),
    );
  }

  // Legacy format: New card created: cardName
  if (message.startsWith("New card created:")) {
    return plain(
      t("notifCreatedCard", {
        cardName: message.slice("New card created:".length).trim(),
      }),
    );
  }

  // Card "cardName" is due on <ISO date> — no human actor, so this reads as a
  // reminder from the app itself.
  if (message.startsWith('Card "') && message.includes('" is due on ')) {
    const dueIso = (message.match(/ is due on (.+)$/) || [])[1] || "";
    return plain(
      t("notifCardDue", {
        cardName: (message.match(/Card "([^"]*)"/) || [])[1] || "",
        date: dueIso ? formatDate(dueIso) : "",
      }),
    );
  }

  // "username" assigned you the card "cardName"
  if (message.includes(" assigned you the card ")) {
    return plain(
      t("notifAssignedCard", {
        cardName:
          (message.match(/assigned you the card "([^"]*)"/) || [])[1] || "",
      }),
    );
  }

  // You have been invited to the board <name>
  if (message.startsWith("You have been invited to the board")) {
    return plain(
      t("notifInvitedBoard", {
        boardName: message
          .slice("You have been invited to the board".length)
          .replace(/^[:\s]+/, "")
          .trim(),
      }),
    );
  }

  // New comment by "username" on card "cardname": <comment html>
  if (message.startsWith('New comment by "')) {
    // `*` not `+`: a card with an empty name stored `on card ""`, which a `+`
    // pattern skips entirely.
    const cardName = (message.match(/on card "([^"]*)"/) || [])[1] || "";
    const marker = `"${cardName}":`;
    const i = message.indexOf(marker);
    const body = i < 0 ? "" : message.substring(i + marker.length).trim();
    return {
      text: t("notifCommentedOn", {
        cardName: cardName || translateText("untitledCard"),
      }),
      // Relative image sources only resolve against the app, and unconstrained
      // images blow up the mail layout.
      body: body
        .replace(/<img src="\//g, `<img src="${baseURL}/`)
        .replace(/<img/g, '<img style="max-width:100%; display:block;"'),
    };
  }

  return plain(message);
};

// Who triggered it. Prefer the joined actor row (it has an avatar); fall back to
// the name embedded in the message for notifications stored before `actorId`
// existed, and to the app itself for system events like due reminders.
const actorName = (n: any): string => {
  if (n.actorName) return n.actorName;
  const m = String(n.message || "").match(
    /New comment by "([^"]+)"|^"([^"]+)" (?:created a new card|assigned you)/,
  );
  return m ? m[1] || m[2] : translateText("systemActor");
};

// Avatars are stored as a path, an absolute URL, or a data: URI. Mail clients
// broadly refuse data: images, so those become inline cid: attachments instead;
// anything without a usable image falls back to an initial-letter circle.
const avatarSource = (image: string, attachments: any[]): string | null => {
  if (!image) return null;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return `${baseURL}${image}`;
  const data = image.match(/^data:(image\/[a-z.+-]+);base64,(.+)$/i);
  if (data) {
    const existing = attachments.find((a) => a.__source === image);
    if (existing) return `cid:${existing.cid}`;
    const cid = `avatar${attachments.length}@localboards`;
    attachments.push({
      cid,
      filename: `avatar${attachments.length}.${(data[1].split("/")[1] || "png").replace(/[^a-z0-9]/gi, "")}`,
      content: Buffer.from(data[2], "base64"),
      contentType: data[1],
      contentDisposition: "inline",
      __source: image,
    });
    return `cid:${cid}`;
  }
  return null;
};

const avatarCell = (n: any, attachments: any[]): string => {
  const src = avatarSource(n.actorImage, attachments);
  if (src) {
    return `<img src="${esc(src)}" width="${AVATAR}" height="${AVATAR}" alt="" style="width:${AVATAR}px;height:${AVATAR}px;border-radius:${AVATAR / 2}px;display:block;object-fit:cover;" />`;
  }
  const initial = esc((actorName(n) || "?").charAt(0).toUpperCase());
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td width="${AVATAR}" height="${AVATAR}" align="center" valign="middle" style="width:${AVATAR}px;height:${AVATAR}px;background-color:${PRIMARY};border-radius:${AVATAR / 2}px;color:#ffffff;font-family:${FONT};font-size:14px;font-weight:600;line-height:${AVATAR}px;">${initial}</td></tr></table>`;
};

// One timeline row: avatar, then "<name> did something <when>" on a single
// wrapping line, with the comment (if any) in a bubble underneath. Colours are
// left to the client wherever possible (rgba over inherited text) so the mail
// looks right in both light and dark mode.
const notificationRow = (n: any, attachments: any[]): string => {
  const { text, body } = describeNotification(n.message);
  const bubble = body
    ? `<tr><td></td><td style="padding:8px 0 0 0;"><div style="border:1px solid rgba(128,128,128,0.35);border-radius:12px;padding:10px 14px;font-family:${FONT};font-size:14px;line-height:20px;">${body}</div></td></tr>`
    : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;width:100%;margin:0 0 16px 0;">
  <tr>
    <td width="${AVATAR}" valign="middle" style="width:${AVATAR}px;padding:0 12px 0 0;">${avatarCell(n, attachments)}</td>
    <td valign="middle" style="font-family:${FONT};font-size:14px;line-height:18px;"><span style="font-weight:600;">${esc(actorName(n))}</span> ${esc(text)} <span style="font-size:12px;opacity:0.6;white-space:nowrap;">${esc(formatDate(n.createdAt))}</span></td>
  </tr>
  ${bubble}
</table>`;
};

const sendNotification = async () => {
  try {
    const db = setupDatabase();
    // Fetch notifications that still need an email: not yet emailed and not yet
    // seen by the user. (`isRead` now means "the user has viewed it", so anything
    // already opened is skipped; `notified` tracks what's already been emailed.)
    // The actor is joined in so the mail can show who did it, like the card does.
    const [rows] = await db.execute(
      `SELECT n.*, u.name AS actorName, u.image AS actorImage, u.type AS actorType
         FROM notifications n
         LEFT JOIN \`user\` u ON u.id = n.actorId
        WHERE n.isRead = FALSE AND n.notified = FALSE
        ORDER BY n.createdAt ASC, n.id ASC`,
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
      actorName: string | null;
      actorImage: string | null;
      actorType: string | null;
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
      // Collected while rendering: inline avatars referenced by cid:.
      const attachments: any[] = [];
      const rowsHtml = userNotifications
        .map((notification) => notificationRow(notification, attachments))
        .join("");

      // Fetch the user's email address — only for accounts that still want
      // notification mails (opt-out lives on the profile; artificial/AI
      // accounts default to off).
      const [userRows] = await db.execute(
        "SELECT email FROM user WHERE id = ? AND emailNotifications = 1",
        [userId],
      );
      const userEmail = userRows[0]?.email;

      if (userEmail) {
        const dashboardUrl = `${baseURL}/dashboard/`;
        await sendEmail({
          to: userEmail,
          subject: buildTitle(translateText("youHaveUnreadNotifications")),
          text: emailLayout(
            emailParagraph(
              `${esc(translateText("youHaveTheFollowingUnreadNotifications"))}:`,
            ) +
              rowsHtml +
              emailButton(
                dashboardUrl,
                translateText("clickHereToViewYourNotifications"),
              ),
          ),
          // `__source` is only used for de-duplicating avatars while building.
          attachments: attachments.map(({ __source, ...a }) => a),
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
