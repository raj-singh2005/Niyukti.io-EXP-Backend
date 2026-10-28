import type { Request, Response } from "express";
import { prisma } from "../../database.js";
import type { ChangeRoleInput } from "../../types/auth.types.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";

export const changeRoleController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  if (!user) {
    throw ApiError.unauthorized("Authentication is required");
  }

  if (user.globalRole !== "ONBOARDING") {
    throw ApiError.conflict("Account role has already been selected");
  }

  const { role }: ChangeRoleInput = req.body;
  const result = await prisma.user.updateMany({
    where: {
      id: user.id,
      globalRole: "ONBOARDING",
    },
    data: {
      globalRole: role,
    },
  });

  if (result.count !== 1) {
    throw ApiError.conflict("Account role has already been selected");
  }

  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      username: true,
      globalRole: true,
      createdAt: true,
    },
  });

  if (!updatedUser) {
    throw ApiError.notFound("Account not found");
  }

  res
    .status(200)
    .json(ApiResponse.success(updatedUser, "Account role selected"));
};