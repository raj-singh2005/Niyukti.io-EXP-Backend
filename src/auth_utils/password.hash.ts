import bcrypt from "bcrypt";
import { ApiError } from "../utils/apiError.js";

export const hashPassword = async (password: string): Promise<string> => {
  try {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    throw ApiError.internal("Failed to hash password securely");
  }
};