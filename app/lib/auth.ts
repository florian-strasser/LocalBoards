import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
//import Database from "better-sqlite3";
import { setupDatabase } from "~/lib/databaseSetup";
import { sendEmail } from "~/lib/sendEmail";

const runtimeConfig = useRuntimeConfig();

const appName = process.env.APP_NAME || "LocalBoards";
const baseURL = runtimeConfig.boardsUrl || "https://boards.florian-strasser.de";

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
        subject: buildTitle("Reset your password"),
        text: `Click on this link to assign a new password: ${baseURL}/reset-password/${token}`,
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
  plugins: [admin()],
});
