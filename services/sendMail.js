import { transporter } from "../config/mailer.js";

export const sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,

    to,
    subject,
    html,
  });
};
