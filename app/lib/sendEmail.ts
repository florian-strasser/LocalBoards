import nodemailer from "nodemailer";
import { logger } from "../../server/utils/logger";

const runtimeConfig = useRuntimeConfig();

const emailHost = runtimeConfig.emailHost;
const emailPort = runtimeConfig.emailPort;
const emailSecure = runtimeConfig.emailSecure;
const emailUser = runtimeConfig.emailUser;
const emailPass = runtimeConfig.emailPass;

const transporter = nodemailer.createTransport({
  host: emailHost,
  port: parseInt(emailPort, 10),
  secure: emailSecure, // true for 465, false for other ports
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

export const sendEmail = async ({ to, subject, text }) => {
  const mailOptions = {
    from: emailUser,
    to,
    subject,
    html: text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info("Email sent", { messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error("Error sending email", error);
    throw error;
  }
};
