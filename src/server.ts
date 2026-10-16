import { config } from "./envConfig.js";
import "./config/redis.config.js";

import app from "./app.js";
import { prisma } from "./database.js";
import { logger } from "./logger/winston.logger.js";
import { emailQueue } from "./queues/email.queue.js";
import "./workers/email.worker.js";

const PORT = process.env.PORT || 5050;
let server: any;

async function startServer() {
  try {
    // Attempt the connection to Neon
    await prisma.$connect();
    logger.info("🐘 Successfully connected to Neon PostgreSQL!");

    server = app.listen(PORT, () => {
      logger.info(`🚀 Niyukti.io Server running on port ${PORT}`);
      logger.info(
        `Swagger Docs available at http://localhost:${PORT}/api-docs`,
      );
      logger.info(
        `Status Monitor available at http://localhost:${PORT}/status`,
      );
    });
  } catch (error) {
    logger.error("❌ Failed to connect to the database:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

startServer();

// ==========================================
// GRACEFUL SHUTDOWN HANDLER
// ==========================================
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed.");

      try {
        // Close BullMQ connections safely
        await emailQueue.close();
        logger.info("BullMQ email queue connections closed.");

        // Disconnect from database safely
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
    });
  } else {
    process.exit(0);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
