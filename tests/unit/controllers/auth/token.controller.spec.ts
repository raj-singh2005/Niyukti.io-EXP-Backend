import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenService } from "../../../../src/auth_utils/token.service.js";
import { refreshTokenController } from "../../../../src/controllers/auth/token.controller.js";
import { logoutController } from "../../../../src/controllers/auth/logout.controller.js";
import {
  accessTokenCookieOptions,
  clearCookieOptions,
  refreshTokenCookieOptions,
} from "../../../../src/utils/cookie.utils.js";
import { ApiError } from "../../../../src/utils/apiError.js";

vi.mock("../../../../src/auth_utils/token.service.js", () => ({
  TokenService: {
    rotateAccessAndRefreshTokens: vi.fn(),
    revokeRefreshToken: vi.fn(),
  },
}));

describe("refreshTokenController", () => {
  const res = {
    clearCookie: vi.fn(),
    cookie: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rotates tokens from the refresh cookie and returns them as cookies", async () => {
    const req = {
      cookies: { refreshToken: "current-refresh-token" },
    } as unknown as Request;
    vi.mocked(TokenService.rotateAccessAndRefreshTokens).mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    await refreshTokenController(req, res);

    expect(TokenService.rotateAccessAndRefreshTokens).toHaveBeenCalledWith(
      "current-refresh-token",
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      1,
      "accessToken",
      "new-access-token",
      accessTokenCookieOptions,
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      "refreshToken",
      "new-refresh-token",
      refreshTokenCookieOptions,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {},
        message: "Session refreshed successfully",
        success: true,
      }),
    );
  });

  it("clears cookies and rejects when the refresh cookie is missing", async () => {
    const req = { cookies: {} } as unknown as Request;

    await expect(refreshTokenController(req, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Refresh token is required",
    });
    expect(res.clearCookie).toHaveBeenNthCalledWith(
      1,
      "accessToken",
      clearCookieOptions,
    );
    expect(res.clearCookie).toHaveBeenNthCalledWith(
      2,
      "refreshToken",
      clearCookieOptions,
    );
    expect(TokenService.rotateAccessAndRefreshTokens).not.toHaveBeenCalled();
  });

  it("clears cookies when the refresh token is invalid", async () => {
    const req = {
      cookies: { refreshToken: "invalid-refresh-token" },
    } as unknown as Request;
    vi.mocked(TokenService.rotateAccessAndRefreshTokens).mockRejectedValue(
      ApiError.unauthorized("Invalid or expired refresh token"),
    );

    await expect(refreshTokenController(req, res)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });

  it("does not misreport internal failures as invalid tokens", async () => {
    const req = {
      cookies: { refreshToken: "current-refresh-token" },
    } as unknown as Request;
    const internalError = new Error("Database unavailable");
    vi.mocked(TokenService.rotateAccessAndRefreshTokens).mockRejectedValue(
      internalError,
    );

    await expect(refreshTokenController(req, res)).rejects.toBe(internalError);
    expect(res.clearCookie).not.toHaveBeenCalled();
  });
});

describe("logoutController", () => {
  const res = {
    clearCookie: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes the refresh token and clears both cookies", async () => {
    const req = {
      cookies: { refreshToken: "current-refresh-token" },
    } as unknown as Request;

    await logoutController(req, res);

    expect(TokenService.revokeRefreshToken).toHaveBeenCalledWith(
      "current-refresh-token",
    );
    expect(res.clearCookie).toHaveBeenNthCalledWith(
      1,
      "accessToken",
      clearCookieOptions,
    );
    expect(res.clearCookie).toHaveBeenNthCalledWith(
      2,
      "refreshToken",
      clearCookieOptions,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Logged out successfully",
        success: true,
      }),
    );
  });

  it("clears cookies and returns success when the refresh cookie is missing", async () => {
    const req = { cookies: {} } as unknown as Request;

    await logoutController(req, res);

    expect(TokenService.revokeRefreshToken).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("clears cookies and propagates database failures during revocation", async () => {
    const req = {
      cookies: { refreshToken: "current-refresh-token" },
    } as unknown as Request;
    const databaseError = new Error("Database unavailable");
    vi.mocked(TokenService.revokeRefreshToken).mockRejectedValue(databaseError);

    await expect(logoutController(req, res)).rejects.toBe(databaseError);

    expect(res.clearCookie).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });
});
