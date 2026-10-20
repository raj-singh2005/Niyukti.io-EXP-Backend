import { describe, expect, it } from "vitest";
import {
  loginSchema,
  sendLoginOtpSchema,
  signupSchema,
} from "../../../src/schemas/auth.schema.js";

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

describe("loginSchema", () => {
  it("accepts email, password, and a six-digit OTP and normalizes the email", () => {
    const result = loginSchema.safeParse({
      email: "  PERSON@EXAMPLE.COM ",
      password: "existing-password",
      otp: "012345",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        email: "person@example.com",
        password: "existing-password",
        otp: "012345",
      });
    }
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "existing-password",
      otp: "123456",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing or empty password", () => {
    expect(
      loginSchema.safeParse({
        email: "person@example.com",
        password: "",
        otp: "123456",
      }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({
        email: "person@example.com",
        otp: "123456",
      }).success,
    ).toBe(false);
  });

  it.each(["12345", "1234567", "12A456", ""] )(
    "rejects an OTP that is not exactly six numeric digits",
    (otp) => {
      expect(
        loginSchema.safeParse({
          email: "person@example.com",
          password: "existing-password",
          otp,
        }).success,
      ).toBe(false);
    },
  );
});

describe("sendLoginOtpSchema", () => {
  it("accepts email and password and normalizes the email", () => {
    const result = sendLoginOtpSchema.safeParse({
      email: "  PERSON@EXAMPLE.COM ",
      password: "existing-password",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        email: "person@example.com",
        password: "existing-password",
      });
    }
  });

  it("rejects invalid email or missing password", () => {
    expect(
      sendLoginOtpSchema.safeParse({
        email: "not-an-email",
        password: "existing-password",
      }).success,
    ).toBe(false);
    expect(
      sendLoginOtpSchema.safeParse({ email: "person@example.com" }).success,
    ).toBe(false);
  });
});
