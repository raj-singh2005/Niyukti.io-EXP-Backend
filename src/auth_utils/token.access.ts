import jwt from "jsonwebtoken";
import { config } from "../envConfig.js";

export const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { userId }, 
    config.jwt.accessSecret as string, 
    {
      expiresIn: config.jwt.accessExpiry as any,
    }
  );
};