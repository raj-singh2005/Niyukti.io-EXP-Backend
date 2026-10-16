import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


import { monitorConfig } from "./monitoring/statusMonitor.js";
import { setupSwagger } from "./docs/swagger.js";
import { EmailService } from "./services/email.service.js";

// Middlewares
import { errorHandler } from "./middlewares/error.middleware.js";
import { helmetMiddleware } from "./middlewares/helmet.middleware.js";

// Utilities
import { asyncHandler } from "./utils/asyncHandler.js";
import { ApiResponse } from "./utils/apiResponse.js";
import { ApiError } from "./utils/apiError.js";

// Database
import { prisma } from "./database.js";

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
      // This immediately stops the request and triggers your global error middleware
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

// 4. API Routes will go here

app.get("/test-email", async (req, res) => {
  try {
    // IMPORTANT: Replace this string with your actual email address to see the result
    const testEmailAddress = "your.personal.email@gmail.com"; 

    await EmailService.sendOtpEmail(testEmailAddress, "Raj", "867530");
    
    res.status(200).json({ 
      success: true, 
      message: "Test email successfully pushed to the BullMQ queue!" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to queue email", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// 5. Global Error Handler (MUST BE THE VERY LAST APP.USE)
app.use(errorHandler);

export default app;
