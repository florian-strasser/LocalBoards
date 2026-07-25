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

// `attachments` is optional and passed straight to nodemailer. The notification
// mail uses it for inline (cid:) avatars, because avatars uploaded through the
// profile are stored as data: URIs and most mail clients refuse to render those.
export const sendEmail = async ({ to, subject, text, attachments = [] }) => {
  const mailOptions = {
    from: emailUser,
    to,
    subject,
    html: text,
    ...(attachments.length > 0 ? { attachments } : {}),
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
