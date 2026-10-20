import type { Request, Response } from "express";
import { TokenService } from "../../auth_utils/token.service.js";
import {
  accessTokenCookieOptions,
  clearCookieOptions,
  refreshTokenCookieOptions,
} from "../../utils/cookie.utils.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";

export const refreshTokenController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const incomingRefreshToken: unknown = req.cookies?.refreshToken;
  if (typeof incomingRefreshToken !== "string" || !incomingRefreshToken) {
    res.clearCookie("accessToken", clearCookieOptions);
    res.clearCookie("refreshToken", clearCookieOptions);
    throw ApiError.unauthorized("Refresh token is required");
  }

  let tokens: Awaited<
    ReturnType<typeof TokenService.rotateAccessAndRefreshTokens>
  >;
  try {
    tokens = await TokenService.rotateAccessAndRefreshTokens(
      incomingRefreshToken,
    );
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      res.clearCookie("accessToken", clearCookieOptions);
      res.clearCookie("refreshToken", clearCookieOptions);
    }
    throw error;
  }

  res.cookie("accessToken", tokens.accessToken, accessTokenCookieOptions);
  res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);
  res
    .status(200)
    .json(ApiResponse.success({}, "Session refreshed successfully"));
};
