import { config } from "./envConfig.js";
import app from "./app.js";
import { prisma } from "./database.js";
import { logger } from "./logger/winston.logger.js";
import { setupGracefulShutdown } from "./utils/shutdown.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    logger.info("🐘 Successfully connected to Neon PostgreSQL!");

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Niyukti.io Server running on port ${PORT}`);
      logger.info(
        `Swagger Docs available at http://localhost:${PORT}/api-docs`,
      );
      logger.info(
        `Status Monitor available at http://localhost:${PORT}/status`,
      );
    });

    // Initialize graceful shutdown monitoring
    setupGracefulShutdown(server);
  } catch (error) {
    logger.error("❌ Failed to connect to the database:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

startServer();