import { Router, type RequestHandler } from "express";
import { createMentorProfileController } from "../controllers/profiles/mentor_profile/createMentorProfile.controller.js";
import { createStudentProfileController } from "../controllers/profiles/student_profile/createStudentProfile.controller.js";
import { mentorMulter } from "../middlewares/profile_middlewares/mentorMulter.middleware.js";
import { studentMulter } from "../middlewares/profile_middlewares/studentMulter.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

const requireStudentRole: RequestHandler = (req, _res, next) => {
  if (req.user?.globalRole !== "STUDENT") {
    next(ApiError.forbidden("Only student accounts can create student profiles"));
    return;
  }
  next();
};

const requireMentorRole: RequestHandler = (req, _res, next) => {
  if (req.user?.globalRole !== "MENTOR") {
    next(ApiError.forbidden("Only mentor accounts can create mentor profiles"));
    return;
  }
  next();
};

const profileRouter = Router();

profileRouter.post(
  "/student",
  verifyJWT,
  requireStudentRole,
  studentMulter,
  asyncHandler(createStudentProfileController),
);

profileRouter.post(
  "/mentor",
  verifyJWT,
  requireMentorRole,
  mentorMulter,
  asyncHandler(createMentorProfileController),
);

export default profileRouter;