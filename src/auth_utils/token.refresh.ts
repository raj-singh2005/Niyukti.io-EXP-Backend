import jwt from "jsonwebtoken";
import { config } from "../envConfig.js";

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId }, 
    config.jwt.refreshSecret as string, 
    {
      expiresIn: config.jwt.refreshExpiry as any,
    }
  );
};