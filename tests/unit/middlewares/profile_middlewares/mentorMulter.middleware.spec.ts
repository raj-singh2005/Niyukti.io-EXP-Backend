import { describe, expect, it } from "vitest";
import { ApiError } from "../../../../src/utils/apiError.js";
import { validateMentorProfileFile } from "../../../../src/middlewares/profile_middlewares/mentorMulter.middleware.js";

describe("validateMentorProfileFile", () => {
  it("accepts supported avatar signatures", () => {
    expect(() =>
      validateMentorProfileFile(
        "avatar",
        "image/jpeg",
        1024,
        Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      ),
    ).not.toThrow();
    expect(() =>
      validateMentorProfileFile(
        "avatar",
        "image/png",
        1024,
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).not.toThrow();
    expect(() =>
      validateMentorProfileFile(
        "avatar",
        "image/webp",
        1024,
        Buffer.from("RIFF0000WEBP"),
      ),
    ).not.toThrow();
  });

  it("accepts a PDF signature for the resume field", () => {
    expect(() =>
      validateMentorProfileFile(
        "resume",
        "application/pdf",
        1024,
        Buffer.from("%PDF-1.7"),
      ),
    ).not.toThrow();
  });

  it("rejects MIME/signature mismatches", () => {
    expect(() =>
      validateMentorProfileFile(
        "avatar",
        "image/png",
        1024,
        Buffer.from("not an image"),
      ),
    ).toThrow(ApiError);
    expect(() =>
      validateMentorProfileFile(
        "resume",
        "application/pdf",
        1024,
        Buffer.from("not a PDF"),
      ),
    ).toThrow(ApiError);
  });

  it("enforces the 5 MB avatar limit", () => {
    expect(() =>
      validateMentorProfileFile(
        "avatar",
        "image/jpeg",
        5 * 1024 * 1024 + 1,
        Buffer.from([0xff, 0xd8, 0xff]),
      ),
    ).toThrow(
      expect.objectContaining({
        statusCode: 413,
        message: "Avatar must be no larger than 5 MB",
      }),
    );
  });
});
