import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcrypt";
import { hashPassword } from "../../../src/auth_utils/password.hash.js";
import { ApiError } from "../../../src/utils/apiError.js";

// Intercept bcrypt so we don't spend CPU cycles actually hashing during tests
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
  },
}));

describe("Password Hashing Utility", () => {
  it("should successfully hash a plain text password", async () => {
    const mockPassword = "SuperSecretPassword123!";
    const mockHash = "$2b$12$mockedHashedPasswordString";
    
    vi.mocked(bcrypt.hash).mockResolvedValueOnce(mockHash as never);

    const result = await hashPassword(mockPassword);

    expect(result).toBe(mockHash);
    expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 12);
    expect(bcrypt.hash).toHaveBeenCalledTimes(1);
  });

  it("should throw an ApiError if bcrypt fails", async () => {
    // 1. Force bcrypt to fail exactly once
    vi.mocked(bcrypt.hash).mockRejectedValueOnce(new Error("Bcrypt failure") as never);

    // 2. Call the function ONCE and store the promise
    const promise = hashPassword("password");
    
    // 3. Expect that single promise to reject with your specific error message
    await expect(promise).rejects.toThrow("Failed to hash password securely");
  });
});