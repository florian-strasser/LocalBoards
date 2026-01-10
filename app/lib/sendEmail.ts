import nodemailer from "nodemailer";

const runtimeConfig = useRuntimeConfig();

const appName = runtimeConfig.appName;

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
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
