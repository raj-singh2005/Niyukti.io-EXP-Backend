import bcrypt from "bcrypt";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../logger/winston.logger.js";

export const isPasswordCorrect = async (
  plainTextPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  try {
    return await bcrypt.compare(plainTextPassword, hashedPassword);
  } catch (error) {
    logger.error("Failed to verify password", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw ApiError.internal("Error verifying password credentials");
  }
};