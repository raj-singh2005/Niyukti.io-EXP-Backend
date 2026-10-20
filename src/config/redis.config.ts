import { Redis } from "ioredis";
import { logger } from "../logger/winston.logger.js";
import { config } from "../envConfig.js"; // Import your new config

export const redisClient = new Redis(config.redis_url, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  family: 4,
  tls: config.redis_url.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
});

redisClient.on("connect", () => {
  logger.info("Successfully connected to Redis instance");
});

redisClient.on("error", (err) => {
  logger.error("Redis connection encountered an error", { error: err.message });
});