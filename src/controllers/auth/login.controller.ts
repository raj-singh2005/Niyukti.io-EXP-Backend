import type { Request, Response } from "express";
import { prisma } from "../../database.js";
import { isPasswordCorrect } from "../../auth_utils/password.isCorrect.js";
import { TokenService } from "../../auth_utils/token.service.js";
import { redisClient } from "../../config/redis.config.js";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../../utils/cookie.utils.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import type { LoginInput } from "../../types/auth.types.js";
import { logger } from "../../logger/winston.logger.js";

const consumeOtpScript = `
  local storedOtp = redis.call("GET", KEYS[1])
  if storedOtp and storedOtp == ARGV[1] then
    local remainingTtl = redis.call("PTTL", KEYS[1])
    if remainingTtl <= 0 then
      return 0
    end
    redis.call("DEL", KEYS[1])
    return remainingTtl
  end
  return 0
`;

const restoreOtpScript = `
  if redis.call("EXISTS", KEYS[1]) == 0 then
    return redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2], "NX") and 1 or 0
  end
  return 0
`;

export const loginController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, password, otp }: LoginInput = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      password: true,
      globalRole: true,
      createdAt: true,
    },
  });

  if (!user || !(await isPasswordCorrect(password, user.password))) {
    throw ApiError.unauthorized("Invalid email or password or verification code");
  }

  let remainingOtpTtl: number;
  try {
    remainingOtpTtl = await redisClient.eval(
      consumeOtpScript,
      1,
      `auth:loginOtp:${user.username}`,
      otp,
    ) as number;
  } catch (error) {
    logger.error("Failed to verify login OTP", {
      error: error instanceof Error ? error.message : "Unknown Redis error",
    });
    throw ApiError.internal("Unable to verify login code");
  }

  if (remainingOtpTtl <= 0) {
    throw ApiError.unauthorized("Invalid email or password or verification code");
  }

  let tokens: Awaited<
    ReturnType<typeof TokenService.generateAccessAndRefreshTokens>
  >;
  try {
    tokens = await TokenService.generateAccessAndRefreshTokens(user.id);
  } catch (error) {
    try {
      await redisClient.eval(
        restoreOtpScript,
        1,
        `auth:loginOtp:${user.username}`,
        otp,
        remainingOtpTtl,
      );
    } catch (restoreError) {
      logger.error("Failed to restore login OTP after token issuance failure", {
        error:
          restoreError instanceof Error
            ? restoreError.message
            : "Unknown Redis error",
      });
    }
    throw error;
  }

  res.cookie("accessToken", tokens.accessToken, accessTokenCookieOptions);
  res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);
  res
    .status(200)
    .json(
      ApiResponse.success(
        {
          id: user.id,
          email: user.email,
          username: user.username,
          globalRole: user.globalRole,
          createdAt: user.createdAt,
        },
        "Login successful",
      ),
    );
};