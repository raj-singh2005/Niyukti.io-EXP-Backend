import dotenv from "dotenv";

// Load environment variables immediately
dotenv.config();

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `CRITICAL SERVER ERROR: Missing environment variable - ${key}`
    );
  }
  return value;
};

export const config = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || "development",
  databaseUrl: getEnv("DATABASE_URL"),
  cloudinary: {
    cloudName: getEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: getEnv("CLOUDINARY_API_KEY"),
    apiSecret: getEnv("CLOUDINARY_API_SECRET"),
  },
  redis_url: getEnv("REDIS_URL"),
  smtp: {
    user: getEnv("SMTP_USER"),
    pass: getEnv("SMTP_PASS"),
  },
  jwt: {
    accessSecret: getEnv("ACCESS_TOKEN_SECRET"),
    accessExpiry: getEnv("ACCESS_TOKEN_EXPIRY"),
    refreshSecret: getEnv("REFRESH_TOKEN_SECRET"),
    refreshExpiry: getEnv("REFRESH_TOKEN_EXPIRY"),
  },
} as const;