import express from "express";
import dotenv from "dotenv";
import { mailQueue } from "./config/mail_queue.js";

dotenv.config();
const app = express();

app.use(express.json());

const port = process.env.PORT || 5001;

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Mail Service Running",
  });
});

app.post("/send-mail", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const { type, ...data } = req.body;

    const allowedTypes = [
      "otp-mail",
      "welcome-mail",
      "login-alert",
      "logout-alert",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mail type",
      });
    }

    const job = await mailQueue.add(type, data, {
      attempts: 5,

      backoff: {
        type: "exponential",
        delay: 3000,
      },

      removeOnComplete: true,

      removeOnFail: 100,
    });

    res.status(201).json({
      success: true,
      message: "Mail queued successfully",
      jobId: job.id,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

app.listen(port, () => {
  console.log(`Producer running on port ${port}`);
});
