import jwt from "jsonwebtoken";
import { generateAccessToken } from "./token.access.js";
import { generateRefreshToken } from "./token.refresh.js";
import { ApiError } from "../utils/apiError.js";
import { prisma } from "../database.js";
import { config } from "../envConfig.js";

export class TokenService {
  public static async generateAccessAndRefreshTokens(userId: string) {
    try {
      const accessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);

      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken },
      });

      return { accessToken, refreshToken };
    } catch (error) {
      throw ApiError.internal(
        "Something went wrong while generating refresh and access tokens",
      );
    }
  }

  public static async rotateAccessAndRefreshTokens(incomingRefreshToken: string) {
    try {
      // 1. Verify the cryptographic signature of the old token
      const decoded = jwt.verify(
        incomingRefreshToken,
        config.jwt.refreshSecret,
      ) as { userId: string };

      // 2. Fetch the user from PostgreSQL
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, refreshToken: true },
      });

      // 3. Prevent reuse: if the token doesn't match the DB, it's invalid or stolen
      if (!user || user.refreshToken !== incomingRefreshToken) {
        throw ApiError.unauthorized("Refresh token is invalid or has been used");
      }

      // 4. Generate and save a new pair using the method we already wrote
      return await this.generateAccessAndRefreshTokens(user.id);
    } catch (error) {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }
  }
}