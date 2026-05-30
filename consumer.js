import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { connection } from "./config/redis.js";
import { transporter } from "./config/mailer.js";

const worker = new Worker(
  "mail-queue",

  async (job) => {
    console.log("Processing job:", job.id);

    const { to, subject, text } = job.data;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    console.log("Mail sent");
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
