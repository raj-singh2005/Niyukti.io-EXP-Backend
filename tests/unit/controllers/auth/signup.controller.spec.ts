import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../../src/database.js";
import { hashPassword } from "../../../../src/auth_utils/password.hash.js";
import { signupController } from "../../../../src/controllers/auth/signup.controller.js";
import { ApiError } from "../../../../src/utils/apiError.js";
import type { SignupInput } from "../../../../src/types/auth.types.js";

vi.mock("../../../../src/database.js", () => ({
  prisma: {
    user: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../../../../src/auth_utils/password.hash.js", () => ({
  hashPassword: vi.fn(),
}));

describe("signupController", () => {
  const input: SignupInput = {
    email: "person@example.com",
    username: "person",
    password: "ValidPass123",
  };
  const createdUser = {
    id: "user-id",
    email: input.email,
    username: input.username,
    globalRole: "ONBOARDING",
    createdAt: new Date("2026-10-20T00:00:00.000Z"),
  };
  const req = { body: input } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hashes the password, creates the user, and returns only safe user data", async () => {
    vi.mocked(hashPassword).mockResolvedValue("hashed-password");
    vi.mocked(prisma.user.create).mockResolvedValue(createdUser as never);

    await signupController(req, res);

    expect(hashPassword).toHaveBeenCalledWith(input.password);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: input.email,
        username: input.username,
        password: "hashed-password",
      },
      select: {
        id: true,
        email: true,
        username: true,
        globalRole: true,
        createdAt: true,
      },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 201,
        data: createdUser,
        message: "Account created successfully",
        success: true,
      }),
    );
  });

  it("converts Prisma unique-constraint errors into a conflict ApiError", async () => {
    vi.mocked(hashPassword).mockResolvedValue("hashed-password");
    vi.mocked(prisma.user.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["email"] },
      }),
    );

    await expect(signupController(req, res)).rejects.toMatchObject({
      statusCode: 409,
      message: "Email or username is already in use",
    });
  });

  it("forwards unexpected database errors without hiding them", async () => {
    const databaseError = new Error("Database unavailable");
    vi.mocked(hashPassword).mockResolvedValue("hashed-password");
    vi.mocked(prisma.user.create).mockRejectedValue(databaseError);

    await expect(signupController(req, res)).rejects.toBe(databaseError);
  });

  it("does not attempt to create a user if password hashing fails", async () => {
    const hashingError = new ApiError(500, "Failed to hash password securely");
    vi.mocked(hashPassword).mockRejectedValue(hashingError);

    await expect(signupController(req, res)).rejects.toBe(hashingError);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
