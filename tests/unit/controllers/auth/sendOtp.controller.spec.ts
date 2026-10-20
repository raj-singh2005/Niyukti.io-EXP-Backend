import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../../src/database.js";
import { isPasswordCorrect } from "../../../../src/auth_utils/password.isCorrect.js";
import { redisClient } from "../../../../src/config/redis.config.js";
import { EmailService } from "../../../../src/services/email.service.js";
import { OtpGenerator } from "../../../../src/utils/otpGenerator.js";
import { sendOtpController } from "../../../../src/controllers/auth/sendOtp.controller.js";

vi.mock("../../../../src/database.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../../../src/auth_utils/password.isCorrect.js", () => ({
  isPasswordCorrect: vi.fn(),
}));

vi.mock("../../../../src/config/redis.config.js", () => ({
  redisClient: {
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("../../../../src/services/email.service.js", () => ({
  EmailService: {
    sendOtpEmail: vi.fn(),
  },
}));

describe("sendOtpController", () => {
  const input = {
    email: "person@example.com",
    password: "ValidPass123",
  };
  const user = {
    email: input.email,
    username: "person",
    password: "hashed-password",
  };
  const req = { body: input } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    vi.mocked(isPasswordCorrect).mockResolvedValue(true);
    vi.mocked(redisClient.set).mockResolvedValue("OK");
    vi.mocked(redisClient.del).mockResolvedValue(1);
    vi.mocked(EmailService.sendOtpEmail).mockResolvedValue();
    vi.spyOn(OtpGenerator, "generateSixDigitNumeric").mockReturnValue(
      "012345",
    );
  });

  it("checks credentials, stores a 10-minute username-keyed OTP, and queues the email", async () => {
    await sendOtpController(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: input.email },
      select: {
        email: true,
        username: true,
        password: true,
      },
    });
    expect(isPasswordCorrect).toHaveBeenCalledWith(
      input.password,
      user.password,
    );
    expect(redisClient.set).toHaveBeenCalledWith(
      "auth:loginOtpCooldown:person",
      "1",
      "EX",
      40,
      "NX",
    );
    expect(redisClient.set).toHaveBeenCalledWith(
      "auth:loginOtp:person",
      "012345",
      "EX",
      600,
    );
    expect(EmailService.sendOtpEmail).toHaveBeenCalledWith(
      user.email,
      user.username,
      "012345",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Login verification code queued",
        success: true,
      }),
    );
  });

  it("rejects resend requests during the 40-second cooldown", async () => {
    vi.mocked(redisClient.set).mockResolvedValueOnce(null as never);

    await expect(sendOtpController(req, res)).rejects.toMatchObject({
      statusCode: 429,
      message: "Please wait before requesting another code",
    });
    expect(redisClient.set).toHaveBeenCalledTimes(1);
    expect(EmailService.sendOtpEmail).not.toHaveBeenCalled();
  });

  it("does not store or send an OTP for invalid credentials", async () => {
    vi.mocked(isPasswordCorrect).mockResolvedValue(false);

    await expect(sendOtpController(req, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid email or password",
    });
    expect(redisClient.set).not.toHaveBeenCalled();
    expect(EmailService.sendOtpEmail).not.toHaveBeenCalled();
  });

  it("does not send an email when Redis fails to store the OTP", async () => {
    vi.mocked(redisClient.set)
      .mockResolvedValueOnce("OK")
      .mockRejectedValueOnce(new Error("Redis unavailable"));

    await expect(sendOtpController(req, res)).rejects.toMatchObject({
      message: "Redis unavailable",
    });
    expect(EmailService.sendOtpEmail).not.toHaveBeenCalled();
    expect(redisClient.del).toHaveBeenCalledWith("auth:loginOtpCooldown:person");
  });

  it("deletes the OTP and propagates an email-queue failure", async () => {
    const emailError = new Error("Email queue unavailable");
    vi.mocked(EmailService.sendOtpEmail).mockRejectedValue(emailError);

    await expect(sendOtpController(req, res)).rejects.toBe(emailError);
    expect(redisClient.del).toHaveBeenCalledWith("auth:loginOtp:person");
    expect(redisClient.del).toHaveBeenCalledWith("auth:loginOtpCooldown:person");
  });
});
