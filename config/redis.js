import dotenv from "dotenv";

dotenv.config();

import Redis from "ioredis";

export const connection = new Redis({
  host: process.env.REDIS_HOST,

  port: Number(process.env.REDIS_PORT),

  password: process.env.REDIS_PASSWORD,

  maxRetriesPerRequest: null,
});
