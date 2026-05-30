import dotenv from "dotenv";

dotenv.config();

import { Worker } from "bullmq";

import { connection } from "./config/redis.js";
import { sendMail } from "./services/sendMail.js";
import { otpTemplate } from "./templates/otpTemplate.js";
import { welcomeTemplate } from "./templates/welcomeTemplate.js";
import { loginTemplate } from "./templates/loginTemplate.js";
import { logoutTemplate } from "./templates/logoutTemplate.js";

const worker = new Worker(
  "mail-queue",

  async (job) => {
    console.log("Processing job:", job.name);

    switch (job.name) {
      case "otp-mail":
        await sendMail({
          to: job.data.to,

          subject: "Your OTP",

          html: otpTemplate(job.data.otp),
        });

        break;

      case "welcome-mail":
        await sendMail({
          to: job.data.to,

          subject: "Welcome",

          html: welcomeTemplate(job.data.name || job.data.to),
        });

        break;

      case "login-alert":
        await sendMail({
          to: job.data.to,

          subject: "New Login Alert",

          html: loginTemplate(job.data.device),
        });

        break;

      case "logout-alert":
        await sendMail({
          to: job.data.to,

          subject: "New LogOut Alert",

          html: logoutTemplate(job.data.device),
        });

        break;

      default:
        console.log("Unknown mail type");
    }
  },

  {
    connection,
  },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.log(`Job failed: ${err.message}`);
});

console.log("Consumer running...");
