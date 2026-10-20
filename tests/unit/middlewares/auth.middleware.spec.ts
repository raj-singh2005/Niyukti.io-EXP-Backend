import type { NextFunction, Request, Response } from "express";
import JWT from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../src/database.js";
import { verifyJWT } from "../../../src/middlewares/auth.middleware.js";
import { ApiError } from "../../../src/utils/apiError.js";

vi.mock("../../../src/envConfig.js", () => ({
  config: {
    jwt: {
      accessSecret: "test-access-secret",
    },
  },
}));

vi.mock("../../../src/database.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("verifyJWT", () => {
  const res = {} as Response;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runMiddleware = (req: Request) =>
    new Promise<unknown>((resolve) => {
      verifyJWT(req, res, ((error?: unknown) => resolve(error)) as NextFunction);
    });

  it("translates invalid JWTs to unauthorized errors", async () => {
    const req = {
      cookies: { accessToken: "invalid-token" },
      header: vi.fn(),
    } as unknown as Request;

    const error = await runMiddleware(req);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ statusCode: 401, message: "Invalid Access Token" });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("forwards database failures instead of translating them to unauthorized", async () => {
    const databaseError = new Error("Database unavailable");
    vi.mocked(prisma.user.findUnique).mockRejectedValue(databaseError);
    const token = JWT.sign({ userId: "user-id" }, "test-access-secret");
    const req = {
      cookies: { accessToken: token },
      header: vi.fn(),
    } as unknown as Request;

    const error = await runMiddleware(req);

    expect(error).toBe(databaseError);
  });
});
