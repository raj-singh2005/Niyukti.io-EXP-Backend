import { Router } from "express";
import { signupController } from "../controllers/auth/signup.controller.js";
import { loginController } from "../controllers/auth/login.controller.js";
import { sendOtpController } from "../controllers/auth/sendOtp.controller.js";
import { logoutController } from "../controllers/auth/logout.controller.js";
import {
  requestPasswordResetOtpController,
  resetPasswordController,
} from "../controllers/auth/forgotPassword.controller.js";
import {
  refreshTokenController,
} from "../controllers/auth/token.controller.js";
import { signupSchema } from "../schemas/auth.schema.js";
import {
  loginSchema,
  requestPasswordResetOtpSchema,
  resetPasswordSchema,
  sendLoginOtpSchema,
} from "../schemas/auth.schema.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const authRouter = Router();

authRouter.post(
  "/signup",
  validateBody(signupSchema),
  asyncHandler(signupController),
);

authRouter.post(
  "/send-otp",
  validateBody(sendLoginOtpSchema),
  asyncHandler(sendOtpController),
);

authRouter.post(
  "/forgot-password/request",
  validateBody(requestPasswordResetOtpSchema),
  asyncHandler(requestPasswordResetOtpController),
);

authRouter.post(
  "/forgot-password/reset",
  validateBody(resetPasswordSchema),
  asyncHandler(resetPasswordController),
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(loginController),
);

authRouter.post("/refresh-token", asyncHandler(refreshTokenController));
authRouter.post("/logout", asyncHandler(logoutController));

export default authRouter;