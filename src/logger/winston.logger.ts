import winston from "winston";

// Define the custom format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta) : ""
    }`;
  })
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    // 1. Write all logs with level 'error' and below to `error.log`
    new winston.transports.File({ 
      filename: "logs/error.log", 
      level: "error" 
    }),
    // 2. Write all logs to `combined.log`
    new winston.transports.File({ 
      filename: "logs/combined.log" 
    }),
  ],
});

// 3. If we are not in production, also log to the console with colors
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    })
  );
}