import { Server } from "http";
import { prisma } from "../database.js";
import { redisClient } from "../config/redis.config.js";
import { emailQueue } from "../queues/email.queue.js";
import { emailWorker } from "../workers/email.worker.js";
import { logger } from "../logger/winston.logger.js";

export const setupGracefulShutdown = (server: Server) => {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn(`Shutdown already in progress. Ignoring ${signal}.`);
      return;
    }

    isShuttingDown = true;
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Fallback timeout
    setTimeout(() => {
      logger.error("Graceful shutdown timeout exceeded. Forcing exit.");
      process.exit(1);
    }, 10000).unref();

    try {
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err) return reject(err);
            resolve();
          });
        });
        logger.info("HTTP server closed. No longer accepting new requests.");
      }

      // 1. Close ALL Workers concurrently
      await Promise.all([emailWorker.close()]);
      logger.info("All BullMQ workers safely closed.");

      // 2. Close ALL Queues concurrently
      await Promise.all([emailQueue.close()]);
      logger.info("All BullMQ queue connections closed.");

      // 3. Quit the shared Redis Client
      await redisClient.quit();
      logger.info("Shared Redis client disconnected.");

      // 4. Disconnect from database safely
      await prisma.$disconnect();
      logger.info("🐘 Disconnected from Neon PostgreSQL.");

      logger.info("Graceful shutdown completed successfully.");
      process.exit(0);
    } catch (error) {
      logger.error("Error during graceful shutdown:", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      process.exit(1);
    }
  };

  // Listen for termination signals
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};