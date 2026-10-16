import { describe, it, expect } from "vitest";
import { OtpGenerator } from "../../../src/utils/otpGenerator.js";

describe("OTP Generator Utility", () => {
  it("should generate a 6-digit numeric OTP", () => {
    const otp = OtpGenerator.generateSixDigitNumeric();
    
    expect(otp).toHaveLength(6);
    expect(otp).toMatch(/^[0-9]{6}$/); 
  });

  it("should generate a 6-character alphanumeric OTP", () => {
    const otp = OtpGenerator.generateSixDigitAlphanumeric();
    
    expect(otp).toHaveLength(6);
    expect(otp).toMatch(/^[A-Z0-9]{6}$/); 
  });

  it("should respect custom length and type configurations", () => {
    const customNumericLength = 10;
    const customNumeric = OtpGenerator.generateCustom(customNumericLength, "numeric");
    
    expect(customNumeric).toHaveLength(customNumericLength);
    expect(customNumeric).toMatch(/^[0-9]{10}$/);

    const customAlphaLength = 8;
    const customAlpha = OtpGenerator.generateCustom(customAlphaLength, "alphanumeric");
    
    expect(customAlpha).toHaveLength(customAlphaLength);
    expect(customAlpha).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("should generate unique values across multiple calls", () => {
    const otp1 = OtpGenerator.generateSixDigitAlphanumeric();
    const otp2 = OtpGenerator.generateSixDigitAlphanumeric();
    
    expect(otp1).not.toBe(otp2); 
  });
});