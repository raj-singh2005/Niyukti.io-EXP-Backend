import type { Request, Response } from "express";
import { TokenService } from "../../auth_utils/token.service.js";
import { clearCookieOptions } from "../../utils/cookie.utils.js";
import { ApiResponse } from "../../utils/apiResponse.js";

export const logoutController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const incomingRefreshToken: unknown = req.cookies?.refreshToken;

  res.clearCookie("accessToken", clearCookieOptions);
  res.clearCookie("refreshToken", clearCookieOptions);

  if (typeof incomingRefreshToken === "string" && incomingRefreshToken) {
    await TokenService.revokeRefreshToken(incomingRefreshToken);
  }

  res
    .status(200)
    .json(ApiResponse.success({}, "Logged out successfully"));
};
