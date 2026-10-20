import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


import { monitorConfig } from "./monitoring/statusMonitor.js";
import { setupSwagger } from "./docs/swagger.js";

// Middlewares
import { errorHandler } from "./middlewares/error.middleware.js";
import { helmetMiddleware } from "./middlewares/helmet.middleware.js";

// Utilities
import { asyncHandler } from "./utils/asyncHandler.js";
import { ApiResponse } from "./utils/apiResponse.js";
import { ApiError } from "./utils/apiError.js";
import { logger } from "./logger/winston.logger.js";

// Database
import { prisma } from "./database.js";
import apiRouter from "./routes/index.routes.js";

const app: Application = express();

// 0. Mount Status Monitor FIRST to track all requests
app.use(monitorConfig);

// 1. Core Security Headers (Now cleanly abstracted)
app.use(helmetMiddleware);

// 2. Standard Middlewares
app.use(cors()); // Adjust origin later when frontend is deployed
app.use(express.json({ limit: "16kb" })); // Parses JSON bodies
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // Parses URL-encoded bodies
app.use(cookieParser()); // Parses cookies for JWT authentication
app.use(express.static("public")); // Makes your public/temp folder accessible if needed

// Swagger interactive docs endpoint
setupSwagger(app);


// 3. Health Check Route
app.get(
  "/health",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Optional: Ping the database to ensure it is actually connected
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      logger.error("Health check database query failed", {
        error: error instanceof Error ? error.message : "Unknown database error",
      });
      throw new ApiError(500, "Database is completely down!");
    }

    // If the database ping succeeds, send the standard success response
    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Niyukti.io backend and database are running!")
      );
  })
);

// 4. API routes
app.use("/api/v1", apiRouter);

// 5. Global Error Handler (MUST BE THE VERY LAST APP.USE)
app.use(errorHandler);

export default app;
