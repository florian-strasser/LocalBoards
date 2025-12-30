// server/tasks/notification.ts
import { setupDatabase } from "~/lib/databaseSetup";
import { sendEmail } from "~/lib/sendEmail";

const appName = process.env.APP_NAME || "LocalBoards";
const baseURL = process.env.PUBLIC_URL || "https://boards.florian-strasser.de";

const buildTitle = (title) => {
  return title + " | " + appName;
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
          return `- ${notification.message}`;
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
          subject: buildTitle("You have unread notifications"),
          text: `You have the following unread notifications:\n\n${notificationMessages}\n\nClick here to view your notifications: ${baseURL}/dashboard/`,
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
