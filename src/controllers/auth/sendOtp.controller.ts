import type { Request, Response } from "express";
import { prisma } from "../../database.js";
import { isPasswordCorrect } from "../../auth_utils/password.isCorrect.js";
import { redisClient } from "../../config/redis.config.js";
import { EmailService } from "../../services/email.service.js";
import { OtpGenerator } from "../../utils/otpGenerator.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { logger } from "../../logger/winston.logger.js";
import type { SendLoginOtpInput } from "../../types/auth.types.js";

const LOGIN_OTP_TTL_SECONDS = 10 * 60;
const LOGIN_OTP_COOLDOWN_SECONDS = 40;

export const sendOtpController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, password }: SendLoginOtpInput = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      email: true,
      username: true,
      password: true,
    },
  });

  if (!user || !(await isPasswordCorrect(password, user.password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const otp = OtpGenerator.generateSixDigitNumeric();
  const redisKey = `auth:loginOtp:${user.username}`;
  const cooldownKey = `auth:loginOtpCooldown:${user.username}`;

  try {
    const cooldownResult = await redisClient.set(
      cooldownKey,
      "1",
      "EX",
      LOGIN_OTP_COOLDOWN_SECONDS,
      "NX",
    );
    if (cooldownResult !== "OK") {
      throw new ApiError(429, "Please wait before requesting another code");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal("Unable to enforce login code cooldown");
  }

  try {
    const otpResult = await redisClient.set(
      redisKey,
      otp,
      "EX",
      LOGIN_OTP_TTL_SECONDS,
    );
    if (otpResult !== "OK") {
      throw ApiError.internal("Unable to store login verification code");
    }
    await EmailService.sendOtpEmail(user.email, user.username, otp);
  } catch (error) {
    const cleanupResults = await Promise.allSettled([
      redisClient.del(redisKey),
      redisClient.del(cooldownKey),
    ]);
    for (const result of cleanupResults) {
      if (result.status === "rejected") {
        logger.error("Failed to clean up login OTP request state", {
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
    .json(ApiResponse.success({}, "Login verification code queued"));
};