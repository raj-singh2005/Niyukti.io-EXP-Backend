import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../../src/database.js";
import { hashPassword } from "../../../../src/auth_utils/password.hash.js";
import { redisClient } from "../../../../src/config/redis.config.js";
import { EmailService } from "../../../../src/services/email.service.js";
import {
  requestPasswordResetOtpController,
  resetPasswordController,
} from "../../../../src/controllers/auth/forgotPassword.controller.js";
import { OtpGenerator } from "../../../../src/utils/otpGenerator.js";

vi.mock("../../../../src/database.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../../../src/auth_utils/password.hash.js", () => ({
  hashPassword: vi.fn(),
}));

vi.mock("../../../../src/config/redis.config.js", () => ({
  redisClient: {
    set: vi.fn(),
    del: vi.fn(),
    eval: vi.fn(),
  },
}));

vi.mock("../../../../src/services/email.service.js", () => ({
  EmailService: {
    sendPasswordResetOtpEmail: vi.fn(),
  },
}));

describe("forgot password controllers", () => {
  const email = "person@example.com";
  const user = {
    id: "user-id",
    email,
    username: "person",
  };
  const requestReq = { body: { email } } as Request;
  const resetReq = {
    body: { email, otp: "012345", password: "NewStrongPass" },
  } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(redisClient.set).mockResolvedValue("OK");
    vi.mocked(redisClient.del).mockResolvedValue(1);
    vi.mocked(redisClient.eval).mockResolvedValue(30_000);
    vi.mocked(hashPassword).mockResolvedValue("hashed-new-password");
    vi.mocked(EmailService.sendPasswordResetOtpEmail).mockResolvedValue();
    vi.spyOn(OtpGenerator, "generateSixDigitNumeric").mockReturnValue(
      "012345",
    );
  });

  it("stores a separate 10-minute reset OTP and queues its email", async () => {
    await requestPasswordResetOtpController(requestReq, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email },
      select: { email: true, username: true },
    });
    expect(redisClient.set).toHaveBeenCalledWith(
      "auth:passwordResetOtpCooldown:person",
      "1",
      "EX",
      40,
      "NX",
    );
    expect(redisClient.set).toHaveBeenCalledWith(
      "auth:passwordResetOtp:person",
      "012345",
      "EX",
      600,
    );
    expect(EmailService.sendPasswordResetOtpEmail).toHaveBeenCalledWith(
      email,
      "person",
      "012345",
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns account not found without creating reset state", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    await expect(
      requestPasswordResetOtpController(requestReq, res),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Account not found",
    });
    expect(redisClient.set).not.toHaveBeenCalled();
    expect(EmailService.sendPasswordResetOtpEmail).not.toHaveBeenCalled();
  });

  it("cleans up reset state if the email cannot be queued", async () => {
    const emailError = new Error("Email queue unavailable");
    vi.mocked(EmailService.sendPasswordResetOtpEmail).mockRejectedValue(
      emailError,
    );

    await expect(
      requestPasswordResetOtpController(requestReq, res),
    ).rejects.toBe(emailError);
    expect(redisClient.del).toHaveBeenCalledWith(
      "auth:passwordResetOtp:person",
    );
    expect(redisClient.del).toHaveBeenCalledWith(
      "auth:passwordResetOtpCooldown:person",
    );
  });

  it("consumes the reset OTP, changes the password, and revokes refresh token", async () => {
    await resetPasswordController(resetReq, res);

    expect(redisClient.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("GET", KEYS[1])'),
      1,
      "auth:passwordResetOtp:person",
      "012345",
    );
    expect(hashPassword).toHaveBeenCalledWith("NewStrongPass");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        password: "hashed-new-password",
        refreshToken: null,
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Password reset successfully. Please log in again.",
        success: true,
      }),
    );
  });

  it("does not change the password when the reset OTP is invalid", async () => {
    vi.mocked(redisClient.eval).mockResolvedValue(0);

    await expect(resetPasswordController(resetReq, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid or expired password reset code",
    });
    expect(hashPassword).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("restores the OTP with its remaining TTL if resetting the password fails", async () => {
    const updateError = new Error("Database unavailable");
    vi.mocked(prisma.user.update).mockRejectedValue(updateError);

    await expect(resetPasswordController(resetReq, res)).rejects.toBe(
      updateError,
    );
    expect(redisClient.eval).toHaveBeenCalledTimes(2);
    expect(redisClient.eval).toHaveBeenLastCalledWith(
      expect.stringContaining('redis.call("EXISTS", KEYS[1])'),
      1,
      "auth:passwordResetOtp:person",
      "012345",
      30_000,
    );
  });
});
