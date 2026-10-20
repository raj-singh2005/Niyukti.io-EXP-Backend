import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../../src/middlewares/error.middleware.js";
import { ApiError } from "../../../src/utils/apiError.js";
import { logger } from "../../../src/logger/winston.logger.js";

vi.mock("../../../src/logger/winston.logger.js", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("errorHandler", () => {
  const req = {
    method: "POST",
    path: "/api/v1/example",
    originalUrl: "/api/v1/example?secret=value",
  } as Request;
  const responseMock = {
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  const res = responseMock as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    responseMock.headersSent = false;
  });

  it("hides unexpected internal errors from the response and logs without query strings", () => {
    const error = new Error("Database connection details");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Internal Server Error",
        errors: [],
      }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      "Request failed",
      expect.objectContaining({
        path: "/api/v1/example",
        error: error.message,
      }),
    );
  });

  it("preserves intentional client errors", () => {
    const error = ApiError.unauthorized("Invalid credentials");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid credentials",
        statusCode: 401,
      }),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each([
    [Object.assign(new SyntaxError("Invalid JSON"), { type: "entity.parse.failed" }), 400, "Invalid request body"],
    [Object.assign(new Error("Payload too large"), { type: "entity.too.large" }), 413, "Request body is too large"],
    [Object.assign(new Error("File too large"), { code: "LIMIT_FILE_SIZE" }), 413, "Uploaded file is too large"],
    [Object.assign(new Error("Unexpected field"), { code: "LIMIT_UNEXPECTED_FILE" }), 400, "Invalid file upload"],
  ])("maps known request errors to safe 4xx responses", (error, statusCode, message) => {
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(statusCode);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message, statusCode }),
    );
  });

  it("delegates when response headers have already been sent", () => {
    responseMock.headersSent = true;
    const error = new Error("Stream failed");

    errorHandler(error, req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
