import express from "express";
import dotenv from "dotenv";
import { mailQueue } from "./config/mail_queue.js";

dotenv.config();

const app = express();

app.use(express.json());

const port = process.env.PORT || 5501;

app.get("/", (req, res) => {
  res.json("Server running");
});

app.post("/send-mail", async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    await mailQueue.add(
      "sendMail",
      {
        to,
        subject,
        text,
      },
      {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 3000,
        },
      },
    );

    res.json({
      success: true,
      message: "Job added to queue",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
    });
  }
});

app.listen(port, () => {
  console.log(`Producer running on port ${port}`);
});
