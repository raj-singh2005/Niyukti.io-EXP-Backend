import bcrypt from "bcrypt";
import { ApiError } from "../utils/apiError.js";

export const isPasswordCorrect = async (
  plainTextPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  try {
    return await bcrypt.compare(plainTextPassword, hashedPassword);
  } catch (error) {
    throw ApiError.internal("Error verifying password credentials");
  }
};