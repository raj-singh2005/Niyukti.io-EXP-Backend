import { describe, expect, it } from "vitest";
import { signupSchema } from "../../../src/schemas/auth.schema.js";

describe("signupSchema", () => {
  it("accepts valid signup data and normalizes email and username", () => {
    const result = signupSchema.safeParse({
      email: "  PERSON@EXAMPLE.COM ",
      username: "  RajSingh  ",
      password: "ValidPass123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        email: "person@example.com",
        username: "RajSingh",
        password: "ValidPass123",
      });
    }
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      email: "not-an-email",
      username: "RajSingh",
      password: "ValidPass123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a blank username after trimming", () => {
    const result = signupSchema.safeParse({
      email: "person@example.com",
      username: "   ",
      password: "ValidPass123",
    });

    expect(result.success).toBe(false);
  });

  it.each(["Short7", "PasswordTooLong123"])(
    "rejects a password outside the 8-16 character range",
    (password) => {
      const result = signupSchema.safeParse({
        email: "person@example.com",
        username: "RajSingh",
        password,
      });

      expect(result.success).toBe(false);
    },
  );
});
