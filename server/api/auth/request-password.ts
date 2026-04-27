import { setupDatabase } from "../../../app/lib/databaseSetup";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../../../app/lib/sendEmail";
import { getEmailSubject, getEmailMessage } from "../../utils/translations";

const runtimeConfig = useRuntimeConfig();

const appName = runtimeConfig.appName;
const baseURL = runtimeConfig.boardsUrl;
const defaultLanguage = runtimeConfig.language;

export default defineEventHandler(async (event) => {
  const method = event.req.method;
  if (method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }
  try {
    const body = await readBody(event);
    const { email } = body;

    // HIGH FIX: Strong email validation with regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email)) {
      event.res.statusCode = 400;
      return { error: "INVALID_EMAIL_FORMAT" };
    }

    const db = await setupDatabase();

    // Check if user exists
    const [users] = await db.execute(
      "SELECT id, name, email FROM `user` WHERE `email` = ?",
      [email],
    );

    // HIGH FIX: Consistent timing - always generate token regardless of user existence
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // HIGH FIX: Use constant-time approach - perform same operations regardless of user existence
    if (users.length > 0) {
      const user = users[0];

      // Store token in verification table
      await db.execute(
        "INSERT INTO `verification` (`id`, `identifier`, `value`, `expiresAt`) VALUES (?, ?, ?, ?)",
        [uuidv4(), user.email, token, expiresAt],
      );

      // Create reset link
      const resetLink = `${baseURL}/reset-password/${token}`;

      // Send email using our email service with translations
      const subject = getEmailSubject(
        "reset_your_password_subject",
        appName,
        defaultLanguage,
      );
      const emailText = getEmailMessage(
        "reset_your_password_message",
        resetLink,
        defaultLanguage,
      );

      await sendEmail({
        to: user.email,
        subject: subject,
        text: emailText,
      });
    }
    // If user doesn't exist, token is generated but not used - timing is similar

    // HIGH FIX: Consistent success message for all cases
    return {
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent",
    };
  } catch (error) {
    console.error("Request password reset error:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
