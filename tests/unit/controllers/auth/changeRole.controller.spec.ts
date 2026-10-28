import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../../src/database.js";
import { changeRoleController } from "../../../../src/controllers/auth/changeRole.controller.js";

vi.mock("../../../../src/database.js", () => ({
  prisma: {
    user: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("changeRoleController", () => {
  const user = {
    id: "user-id",
    email: "person@example.com",
    username: "person",
    globalRole: "ONBOARDING",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  const req = {
    user,
    body: { role: "STUDENT" },
  } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...user,
      globalRole: "STUDENT",
    } as never);
  });

  it("changes only the authenticated ONBOARDING user's role", async () => {
    await changeRoleController(req, res);

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: user.id,
        globalRole: "ONBOARDING",
      },
      data: { globalRole: "STUDENT" },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        username: true,
        globalRole: true,
        createdAt: true,
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Account role selected",
        success: true,
        data: expect.objectContaining({ globalRole: "STUDENT" }),
      }),
    );
  });

  it("rejects a user who has already selected a role", async () => {
    const alreadySelectedRequest = {
      ...req,
      user: { ...user, globalRole: "MENTOR" },
    } as Request;

    await expect(
      changeRoleController(alreadySelectedRequest, res),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Account role has already been selected",
    });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a concurrent selection if the role is no longer ONBOARDING", async () => {
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });

    await expect(changeRoleController(req, res)).rejects.toMatchObject({
      statusCode: 409,
      message: "Account role has already been selected",
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects requests without an authenticated user", async () => {
    const unauthenticatedRequest = { body: { role: "STUDENT" } } as Request;

    await expect(
      changeRoleController(unauthenticatedRequest, res),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Authentication is required",
    });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
});
