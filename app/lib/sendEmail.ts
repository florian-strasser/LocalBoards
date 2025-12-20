import nodemailer from "nodemailer";

const emailHost = process.env.EMAIL_HOST || "mail.agenturserver.de";
const emailPort = process.env.EMAIL_PORT || 465;
const emailSecure = process.env.EMAIL_SECURE || true;
const emailUser = process.env.EMAIL_USER || "test@florian-strasser.de";
const emailPass = process.env.EMAIL_PASS || "ry1!jj-nf_Iiqh[i";

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
