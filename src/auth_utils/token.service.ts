import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "./token.access.js";
import { generateRefreshToken } from "./token.refresh.js";
import { ApiError } from "../utils/apiError.js";
import { prisma } from "../database.js";
import { config } from "../envConfig.js";
import { logger } from "../logger/winston.logger.js";

export class TokenService {
  private static hashRefreshToken(refreshToken: string): string {
    return createHash("sha256").update(refreshToken).digest("hex");
  }

  private static createTokenPair(userId: string) {
    try {
      return {
        accessToken: generateAccessToken(userId),
        refreshToken: generateRefreshToken(userId),
      };
    } catch (error) {
      logger.error("Failed to generate authentication tokens", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ApiError.internal("Unable to generate authentication tokens");
    }
  }

  public static async generateAccessAndRefreshTokens(userId: string) {
    const tokens = this.createTokenPair(userId);
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: this.hashRefreshToken(tokens.refreshToken) },
      });
      return tokens;
    } catch (error) {
      logger.error("Failed to persist authentication refresh token", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ApiError.internal(
        "Something went wrong while generating refresh and access tokens",
      );
    }
  }

  public static async rotateAccessAndRefreshTokens(incomingRefreshToken: string) {
    let decoded: jwt.JwtPayload | string;
    try {
      decoded = jwt.verify(
        incomingRefreshToken,
        config.jwt.refreshSecret,
      );
    } catch (error) {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string" ||
      decoded.userId.length === 0
    ) {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, refreshToken: true },
    });

    const currentTokenHash = this.hashRefreshToken(incomingRefreshToken);
    if (!user || user.refreshToken !== currentTokenHash) {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const tokens = this.createTokenPair(user.id);
    try {
      const result = await prisma.user.updateMany({
        where: {
          id: user.id,
          refreshToken: currentTokenHash,
        },
        data: {
          refreshToken: this.hashRefreshToken(tokens.refreshToken),
        },
      });
      if (result.count !== 1) {
        throw ApiError.unauthorized("Invalid or expired refresh token");
      }
      return tokens;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Failed to rotate authentication tokens", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ApiError.internal("Unable to rotate authentication tokens");
    }
  }

  public static async revokeRefreshToken(incomingRefreshToken: string): Promise<void> {
    let decoded: jwt.JwtPayload | string;
    try {
      decoded = jwt.verify(
        incomingRefreshToken,
        config.jwt.refreshSecret,
      );
    } catch {
      return;
    }

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string" ||
      decoded.userId.length === 0
    ) {
      return;
    }

    await prisma.user.updateMany({
      where: {
        id: decoded.userId,
        refreshToken: this.hashRefreshToken(incomingRefreshToken),
      },
      data: { refreshToken: null },
    });
  }
}