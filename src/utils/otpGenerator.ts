import crypto from "crypto";

export class OtpGenerator {
  /**
   * Method 3: Flexible generator taking length and type
   */
  public static generateCustom(length: number, type: "numeric" | "alphanumeric"): string {
    const numericChars = "0123456789";
    const alphaNumericChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    const chars = type === "numeric" ? numericChars : alphaNumericChars;
    let otp = "";
    
    for (let i = 0; i < length; i++) {
      // crypto.randomInt ensures an unbiased, cryptographically secure random index
      const randomIndex = crypto.randomInt(0, chars.length);
      otp += chars[randomIndex];
    }
    
    return otp;
  }

  /**
   * Method 1: Generates a standard 6-digit numeric OTP
   */
  public static generateSixDigitNumeric(): string {
    return this.generateCustom(6, "numeric");
  }

  /**
   * Method 2: Generates a standard 6-character alphanumeric OTP
   */
  public static generateSixDigitAlphanumeric(): string {
    return this.generateCustom(6, "alphanumeric");
  }
}