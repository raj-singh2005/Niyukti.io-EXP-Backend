import bcrypt from "bcrypt";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../logger/winston.logger.js";

export const hashPassword = async (password: string): Promise<string> => {
  try {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    logger.error("Failed to hash password", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw ApiError.internal("Failed to hash password securely");
  }
};