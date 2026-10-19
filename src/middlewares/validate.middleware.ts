
import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { ApiError } from "../utils/apiError.js";

type RequestPart = "body" | "params" | "query";

const createValidator = (part: RequestPart, schema: z.ZodType) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req[part]);

      if (part === "body") {
        req.body = parsed;
      } else {
        Object.defineProperty(req, part, {
          configurable: true,
          enumerable: true,
          value: parsed,
          writable: true,
        });
      }

      return next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: [part, ...issue.path].join("."),
          message: issue.message,
        }));

        const message = errors
          .map((err) => `${err.field || "input"}: ${err.message}`)
          .join(", ");

        return next(
          ApiError.badRequest(`Validation failed: ${message}`, errors)
        );
      }

      return next(error);
    }
  };
};

export const validateBody = (schema: z.ZodType) =>
  createValidator("body", schema);

export const validateParams = (schema: z.ZodType) =>
  createValidator("params", schema);

export const validateQuery = (schema: z.ZodType) =>
  createValidator("query", schema);
