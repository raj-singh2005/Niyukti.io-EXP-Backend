import { Router } from "express";
import { signupController } from "../controllers/auth/signup.controller.js";
import { sendOtpController } from "../controllers/auth/sendOtp.controller.js";
import { signupSchema } from "../schemas/auth.schema.js";
import { sendLoginOtpSchema } from "../schemas/auth.schema.js";
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

export default authRouter;