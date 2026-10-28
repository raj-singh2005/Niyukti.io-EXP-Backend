import type { Request, Response } from "express";
import { prisma } from "../../database.js";
import { hashPassword } from "../../auth_utils/password.hash.js";
import { redisClient } from "../../config/redis.config.js";
import { EmailService } from "../../services/email.service.js";
import type {
  RequestPasswordResetOtpInput,
  ResetPasswordInput,
} from "../../types/auth.types.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { logger } from "../../logger/winston.logger.js";
import { OtpGenerator } from "../../utils/otpGenerator.js";

const PASSWORD_RESET_OTP_TTL_SECONDS = 10 * 60;
const PASSWORD_RESET_OTP_COOLDOWN_SECONDS = 40;

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

export const requestPasswordResetOtpController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email }: RequestPasswordResetOtpInput = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      email: true,
      username: true,
    },
  });

  if (!user) {
    throw ApiError.notFound("Account not found");
  }

  const otp = OtpGenerator.generateSixDigitNumeric();
  const redisKey = `auth:passwordResetOtp:${user.username}`;
  const cooldownKey = `auth:passwordResetOtpCooldown:${user.username}`;

  try {
    const cooldownResult = await redisClient.set(
      cooldownKey,
      "1",
      "EX",
      PASSWORD_RESET_OTP_COOLDOWN_SECONDS,
      "NX",
    );
    if (cooldownResult !== "OK") {
      throw new ApiError(429, "Please wait before requesting another code");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("Failed to enforce password reset OTP cooldown", {
      error: error instanceof Error ? error.message : "Unknown Redis error",
    });
    throw ApiError.internal("Unable to enforce password reset code cooldown");
  }

  try {
    const otpResult = await redisClient.set(
      redisKey,
      otp,
      "EX",
      PASSWORD_RESET_OTP_TTL_SECONDS,
    );
    if (otpResult !== "OK") {
      logger.error("Redis did not confirm password reset OTP storage");
      throw ApiError.internal("Unable to store password reset code");
    }
    await EmailService.sendPasswordResetOtpEmail(
      user.email,
      user.username,
      otp,
    );
  } catch (error) {
    if (!(error instanceof ApiError)) {
      logger.error("Failed to store password reset OTP or queue its email", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    const cleanupResults = await Promise.allSettled([
      redisClient.del(redisKey),
      redisClient.del(cooldownKey),
    ]);
    for (const result of cleanupResults) {
      if (result.status === "rejected") {
        logger.error("Failed to clean up password reset OTP request state", {
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown cleanup error",
        });
      }
    }
    throw error;
  }

  res
    .status(200)
    .json(ApiResponse.success({}, "Password reset code queued"));
};

export const resetPasswordController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, otp, password }: ResetPasswordInput = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    throw ApiError.notFound("Account not found");
  }

  const redisKey = `auth:passwordResetOtp:${user.username}`;
  let remainingOtpTtl: number;
  try {
    remainingOtpTtl = (await redisClient.eval(
      consumeOtpScript,
      1,
      redisKey,
      otp,
    )) as number;
  } catch (error) {
    logger.error("Failed to verify password reset OTP", {
      error: error instanceof Error ? error.message : "Unknown Redis error",
    });
    throw ApiError.internal("Unable to verify password reset code");
  }

  if (remainingOtpTtl <= 0) {
    throw ApiError.unauthorized("Invalid or expired password reset code");
  }

  try {
    const hashedPassword = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        refreshToken: null,
      },
    });
  } catch (error) {
    try {
      await redisClient.eval(
        restoreOtpScript,
        1,
        redisKey,
        otp,
        remainingOtpTtl,
      );
    } catch (restoreError) {
      logger.error("Failed to restore password reset OTP after reset failure", {
        error:
          restoreError instanceof Error
            ? restoreError.message
            : "Unknown Redis error",
      });
    }
    throw error;
  }

  res
    .status(200)
    .json(
      ApiResponse.success(
        {},
        "Password reset successfully. Please log in again.",
      ),
    );
};