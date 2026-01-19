import { betterAuth } from "better-auth";
import { admin, apiKey } from "better-auth/plugins";
import { setupDatabase } from "~/lib/databaseSetup";
import { sendEmail } from "~/lib/sendEmail";

const runtimeConfig = useRuntimeConfig();

const appName = runtimeConfig.appName;
const baseURL = runtimeConfig.boardsUrl;

const language = runtimeConfig.language;

const textList = {
  en: {
    resetYourPassword: "Reset your password",
    resetYourPasswordText: "Click on this link to assign a new password",
  },
  de: {
    resetYourPassword: "Passwort zurücksetzen",
    resetYourPasswordText:
      "Klicke auf diesen Link, um ein neues Passwort zu vergeben",
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

export const auth = betterAuth({
  database: setupDatabase(),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: buildTitle(translateText("resetYourPassword")),
        text:
          translateText("resetYourPasswordText") +
          ": " +
          baseURL +
          "/reset-password/" +
          token,
      });
    },
    onPasswordReset: async ({ user }, request) => {
      // your logic here
      console.log(`Password for user ${user.email} has been reset.`);
    },
  },
  trustedOrigins: [baseURL, "http://localhost:3000"],
  socialProviders: {
    // Add social providers if needed
  },
  plugins: [
    admin(),
    apiKey({
      rateLimit: {
        enabled: true,
        timeWindow: 1000 * 60 * 60, // 1 hour
        maxRequests: 10, // 10 requests per hour
      },
    }),
  ],
});
