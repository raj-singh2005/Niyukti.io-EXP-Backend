import { Request, Response, NextFunction } from "express";
import JWT from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../database.js";
import { config } from "../envConfig.js";

// Augment the Express Request interface so TypeScript accepts `req.user`
declare global {
  namespace Express {
    interface Request {
      // Using Omit to represent the user without password and refreshToken
      user?: Omit<
        import("@prisma/client").User,
        "password" | "refreshToken"
      >;
    }
  }
}

export const verifyJWT = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

      // console.log("DEBUG TOKEN:", token, "| TYPE:", typeof token);

      if (
        !token ||
        typeof token !== "string" ||
        token.trim() === "" ||
        token === "undefined"
      ) {
        throw ApiError.unauthorized(
          "Unauthorized request - Invalid token format received"
        );
      }

      // We decode assuming the payload structure we built earlier: { userId: string }
      const decodedToken = JWT.verify(
        token,
        config.jwt.accessSecret
      ) as { userId: string };

      // Prisma equivalent of Mongoose's .select("-password -refreshToken")
      const user = await prisma.user.findUnique({
        where: { id: decodedToken.userId },
        omit: {
          password: true,
          refreshToken: true,
        },
      });

      if (!user) {
        throw ApiError.unauthorized("invalid Access Token");
      }

      req.user = user;
      next();
    } catch (error: any) {
      next(ApiError.unauthorized(error?.message || "Invalid Access Token"));
    }
  }
);