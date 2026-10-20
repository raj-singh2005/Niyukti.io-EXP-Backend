import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../src/database.js";
import { generateAccessToken } from "../../../src/auth_utils/token.access.js";
import { generateRefreshToken } from "../../../src/auth_utils/token.refresh.js";
import { TokenService } from "../../../src/auth_utils/token.service.js";

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock("../../../src/database.js", () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../../../src/auth_utils/token.access.js", () => ({
  generateAccessToken: vi.fn(),
}));

vi.mock("../../../src/auth_utils/token.refresh.js", () => ({
  generateRefreshToken: vi.fn(),
}));

vi.mock("../../../src/envConfig.js", () => ({
  config: {
    jwt: {
      refreshSecret: "test-secret",
    },
  },
}));

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

describe("TokenService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateAccessToken).mockReturnValue("new-access-token");
    vi.mocked(generateRefreshToken).mockReturnValue("new-refresh-token");
  });

  it("stores a hash of the refresh token when generating a token pair", async () => {
    await expect(
      TokenService.generateAccessAndRefreshTokens("user-id"),
    ).resolves.toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-id" },
      data: { refreshToken: hashToken("new-refresh-token") },
    });
  });

  it("atomically rotates only the matching stored refresh-token hash", async () => {
    vi.mocked(jwt.verify).mockReturnValue({ userId: "user-id" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-id",
      refreshToken: hashToken("current-refresh-token"),
    } as never);
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);

    await expect(
      TokenService.rotateAccessAndRefreshTokens("current-refresh-token"),
    ).resolves.toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: "user-id",
        refreshToken: hashToken("current-refresh-token"),
      },
      data: { refreshToken: hashToken("new-refresh-token") },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects when another concurrent refresh already rotated the token", async () => {
    vi.mocked(jwt.verify).mockReturnValue({ userId: "user-id" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-id",
      refreshToken: hashToken("current-refresh-token"),
    } as never);
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 } as never);

    await expect(
      TokenService.rotateAccessAndRefreshTokens("current-refresh-token"),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid or expired refresh token",
    });
  });

  it("does not accept previously stored plaintext refresh tokens", async () => {
    vi.mocked(jwt.verify).mockReturnValue({ userId: "user-id" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-id",
      refreshToken: "current-refresh-token",
    } as never);

    await expect(
      TokenService.rotateAccessAndRefreshTokens("current-refresh-token"),
    ).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("revokes the matching stored refresh-token hash", async () => {
    vi.mocked(jwt.verify).mockReturnValue({ userId: "user-id" } as never);
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);

    await expect(
      TokenService.revokeRefreshToken("current-refresh-token"),
    ).resolves.toBeUndefined();

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: "user-id",
        refreshToken: hashToken("current-refresh-token"),
      },
      data: { refreshToken: null },
    });
  });

  it("treats invalid refresh tokens as already revoked", async () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await expect(
      TokenService.revokeRefreshToken("invalid-refresh-token"),
    ).resolves.toBeUndefined();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("treats a stale token as already revoked when no hash matches", async () => {
    vi.mocked(jwt.verify).mockReturnValue({ userId: "user-id" } as never);
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 } as never);

    await expect(
      TokenService.revokeRefreshToken("stale-refresh-token"),
    ).resolves.toBeUndefined();
    expect(prisma.user.updateMany).toHaveBeenCalled();
  });

  it("propagates database failures during revocation", async () => {
    vi.mocked(jwt.verify).mockReturnValue({ userId: "user-id" } as never);
    const databaseError = new Error("Database unavailable");
    vi.mocked(prisma.user.updateMany).mockRejectedValue(databaseError);

    await expect(
      TokenService.revokeRefreshToken("current-refresh-token"),
    ).rejects.toBe(databaseError);
  });
});
