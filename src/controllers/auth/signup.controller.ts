import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../database.js";
import { hashPassword } from "../../auth_utils/password.hash.js";
import type { SignupInput } from "../../types/auth.types.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";

export const signupController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, username, password }: SignupInput = req.body;
  const hashedPassword = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        globalRole: true,
        createdAt: true,
      },
    });

    res
      .status(201)
      .json(ApiResponse.created(user, "Account created successfully"));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw ApiError.conflict("Email or username is already in use");
    }

    throw error;
  }
};