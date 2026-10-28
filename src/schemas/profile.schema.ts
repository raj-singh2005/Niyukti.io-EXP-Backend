import { z } from "zod";
import type {
  CreateMentorProfileInput,
  CreateStudentProfileInput,
} from "../types/profile.types.js";

const skillsFieldSchema = z.preprocess((value: unknown) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.array(z.string().trim().min(1, "Skills cannot contain blank values")).min(1));

export const createStudentProfileSchema: z.ZodType<CreateStudentProfileInput> =
  z
    .object({
      fullName: z.string().trim().min(1, "Full name is required"),
      collegeName: z.string().trim().min(1, "College name is required"),
      degree: z.string().trim().min(1, "Degree is required"),
      major: z.string().trim().min(1, "Major is required"),
      graduationYear: z.preprocess(
        (value: unknown) =>
          typeof value === "string" && value.trim() !== ""
            ? Number(value)
            : value,
        z.number().int().positive("Graduation year must be a positive integer"),
      ),
      interestSummary: z
        .string()
        .trim()
        .min(1, "Interest summary is required"),
      skills: skillsFieldSchema,
    })
    .strict();

const expertiseFieldSchema = z.preprocess((value: unknown) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.array(z.string().trim().min(1, "Expertise cannot contain blank values")).min(1));

export const createMentorProfileSchema: z.ZodType<CreateMentorProfileInput> =
  z
    .object({
      fullName: z.string().trim().min(1, "Full name is required"),
      currentCompany: z.string().trim().min(1, "Current company is required"),
      designation: z.string().trim().min(1, "Designation is required"),
      yearsOfExperience: z.preprocess(
        (value: unknown) =>
          typeof value === "string" && value.trim() !== ""
            ? Number(value)
            : value,
        z
          .number()
          .int()
          .nonnegative("Years of experience cannot be negative"),
      ),
      expertise: expertiseFieldSchema,
      linkedinUrl: z.string().trim().url("LinkedIn URL must be a valid URL"),
    })
    .strict();
