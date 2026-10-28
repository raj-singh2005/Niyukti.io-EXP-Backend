import { describe, expect, it } from "vitest";
import {
  createMentorProfileSchema,
  createStudentProfileSchema,
} from "../../../src/schemas/profile.schema.js";

describe("createStudentProfileSchema", () => {
  const validInput = {
    fullName: "  Alex Student ",
    collegeName: " Example University ",
    degree: " B.Tech ",
    major: " Computer Science ",
    graduationYear: "2027",
    interestSummary: " Interested in backend development. ",
    skills: '["TypeScript"," SQL "]',
  };

  it("trims text, converts graduation year, and parses the skills JSON array", () => {
    expect(createStudentProfileSchema.parse(validInput)).toEqual({
      fullName: "Alex Student",
      collegeName: "Example University",
      degree: "B.Tech",
      major: "Computer Science",
      graduationYear: 2027,
      interestSummary: "Interested in backend development.",
      skills: ["TypeScript", "SQL"],
    });
  });

  describe("createMentorProfileSchema", () => {
    const validInput = {
      fullName: "  Alex Mentor ",
      currentCompany: " Example Technologies ",
      designation: " Senior Software Engineer ",
      yearsOfExperience: "8",
      expertise: '["Backend Engineering"," System Design "]',
      linkedinUrl: " https://www.linkedin.com/in/alex-mentor ",
    };

    it("trims text, converts experience, and parses the expertise JSON array", () => {
      expect(createMentorProfileSchema.parse(validInput)).toEqual({
        fullName: "Alex Mentor",
        currentCompany: "Example Technologies",
        designation: "Senior Software Engineer",
        yearsOfExperience: 8,
        expertise: ["Backend Engineering", "System Design"],
        linkedinUrl: "https://www.linkedin.com/in/alex-mentor",
      });
    });

    it("allows zero years of experience", () => {
      expect(
        createMentorProfileSchema.parse({
          ...validInput,
          yearsOfExperience: "0",
        }).yearsOfExperience,
      ).toBe(0);
    });

    it("rejects invalid experience, LinkedIn URL, expertise, and unknown fields", () => {
      expect(
        createMentorProfileSchema.safeParse({
          ...validInput,
          yearsOfExperience: "-1",
        }).success,
      ).toBe(false);
      expect(
        createMentorProfileSchema.safeParse({
          ...validInput,
          yearsOfExperience: "2.5",
        }).success,
      ).toBe(false);
      expect(
        createMentorProfileSchema.safeParse({
          ...validInput,
          linkedinUrl: "not-a-url",
        }).success,
      ).toBe(false);
      expect(
        createMentorProfileSchema.safeParse({
          ...validInput,
          expertise: "not-json",
        }).success,
      ).toBe(false);
      expect(
        createMentorProfileSchema.safeParse({
          ...validInput,
          expertise: "[]",
        }).success,
      ).toBe(false);
      expect(
        createMentorProfileSchema.safeParse({
          ...validInput,
          userId: "another-user",
        }).success,
      ).toBe(false);
    });
  });

  it("rejects missing required fields, invalid graduation year, and malformed skills JSON", () => {
    expect(
      createStudentProfileSchema.safeParse({
        ...validInput,
        collegeName: "   ",
      }).success,
    ).toBe(false);
    expect(
      createStudentProfileSchema.safeParse({
        ...validInput,
        graduationYear: "2027.5",
      }).success,
    ).toBe(false);
    expect(
      createStudentProfileSchema.safeParse({
        ...validInput,
        skills: "not-json",
      }).success,
    ).toBe(false);
  });

  it("rejects empty or non-string skills and unknown multipart fields", () => {
    expect(
      createStudentProfileSchema.safeParse({
        ...validInput,
        skills: "[]",
      }).success,
    ).toBe(false);
    expect(
      createStudentProfileSchema.safeParse({
        ...validInput,
        skills: '["TypeScript", 4]',
      }).success,
    ).toBe(false);
    expect(
      createStudentProfileSchema.safeParse({
        ...validInput,
        userId: "another-user",
      }).success,
    ).toBe(false);
  });
});
