import { z } from "zod";
import type { SignupInput } from "../types/auth.types.js";

export const signupSchema: z.ZodType<SignupInput> = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  username: z.string().trim().min(1, "Username is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(16, "Password must be no more than 16 characters"),
});