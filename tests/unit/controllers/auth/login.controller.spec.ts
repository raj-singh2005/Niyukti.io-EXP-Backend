import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../../src/database.js";
import { isPasswordCorrect } from "../../../../src/auth_utils/password.isCorrect.js";
import { TokenService } from "../../../../src/auth_utils/token.service.js";
import { redisClient } from "../../../../src/config/redis.config.js";
import { loginController } from "../../../../src/controllers/auth/login.controller.js";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../../../../src/utils/cookie.utils.js";

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

vi.mock("../../../../src/auth_utils/token.service.js", () => ({
  TokenService: {
    generateAccessAndRefreshTokens: vi.fn(),
  },
}));

vi.mock("../../../../src/config/redis.config.js", () => ({
  redisClient: {
    eval: vi.fn(),
  },
}));

describe("loginController", () => {
  const input = {
    email: "person@example.com",
    password: "ValidPass123",
    otp: "012345",
  };
  const user = {
    id: "user-id",
    email: input.email,
    username: "person",
    password: "hashed-password",
    globalRole: "ONBOARDING",
    createdAt: new Date("2026-10-20T00:00:00.000Z"),
  };
  const req = { body: input } as Request;
  const res = {
    cookie: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    vi.mocked(isPasswordCorrect).mockResolvedValue(true);
    vi.mocked(redisClient.eval).mockResolvedValue(599_000);
    vi.mocked(TokenService.generateAccessAndRefreshTokens).mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("verifies credentials and consumes OTP before setting token cookies", async () => {
    await loginController(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        globalRole: true,
        createdAt: true,
      },
    });
    expect(isPasswordCorrect).toHaveBeenCalledWith(
      input.password,
      user.password,
    );
    expect(redisClient.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("PTTL", KEYS[1])'),
      1,
      "auth:loginOtp:person",
      input.otp,
    );
    expect(TokenService.generateAccessAndRefreshTokens).toHaveBeenCalledWith(
      user.id,
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      1,
      "accessToken",
      "access-token",
      accessTokenCookieOptions,
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      "refreshToken",
      "refresh-token",
      refreshTokenCookieOptions,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          globalRole: user.globalRole,
          createdAt: user.createdAt,
        },
        message: "Login successful",
        success: true,
      }),
    );
  });

  it("restores the OTP with its remaining TTL if token issuance fails", async () => {
    const tokenError = new Error("Token persistence failed");
    vi.mocked(TokenService.generateAccessAndRefreshTokens).mockRejectedValue(
      tokenError,
    );
    vi.mocked(redisClient.eval)
      .mockResolvedValueOnce(599_000)
      .mockResolvedValueOnce(1);

    await expect(loginController(req, res)).rejects.toBe(tokenError);

    expect(redisClient.eval).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('redis.call("SET", KEYS[1]'),
      1,
      "auth:loginOtp:person",
      input.otp,
      599_000,
    );
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("rejects invalid credentials without checking Redis", async () => {
    vi.mocked(isPasswordCorrect).mockResolvedValue(false);

    await expect(loginController(req, res)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(redisClient.eval).not.toHaveBeenCalled();
    expect(TokenService.generateAccessAndRefreshTokens).not.toHaveBeenCalled();
  });

  it("rejects an invalid or expired OTP without issuing tokens", async () => {
    vi.mocked(redisClient.eval).mockResolvedValue(0);

    await expect(loginController(req, res)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(TokenService.generateAccessAndRefreshTokens).not.toHaveBeenCalled();
  });

  it("returns an internal error if Redis cannot verify the OTP", async () => {
    vi.mocked(redisClient.eval).mockRejectedValue(new Error("Redis unavailable"));

    await expect(loginController(req, res)).rejects.toMatchObject({
      statusCode: 500,
      message: "Unable to verify login code",
    });
    expect(TokenService.generateAccessAndRefreshTokens).not.toHaveBeenCalled();
  });
});
