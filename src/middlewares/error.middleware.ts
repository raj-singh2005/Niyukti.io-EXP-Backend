import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../logger/winston.logger.js";

type RequestError = Error & {
  code?: string;
  status?: number;
  type?: string;
};

const getRequestErrorResponse = (
  err: Error,
): { statusCode: number; message: string } | undefined => {
  const requestError = err as RequestError;

  if (requestError.type === "entity.parse.failed") {
    return { statusCode: 400, message: "Invalid request body" };
  }

  if (requestError.type === "entity.too.large") {
    return { statusCode: 413, message: "Request body is too large" };
  }

  if (requestError.code === "LIMIT_FILE_SIZE") {
    return { statusCode: 413, message: "Uploaded file is too large" };
  }

  if (requestError.code?.startsWith("LIMIT_")) {
    return { statusCode: 400, message: "Invalid file upload" };
  }

  return undefined;
};

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: unknown[] = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }

  if (!(err instanceof ApiError)) {
    const requestErrorResponse = getRequestErrorResponse(err);
    if (requestErrorResponse) {
      statusCode = requestErrorResponse.statusCode;
      message = requestErrorResponse.message;
    }
  }

  if (!(err instanceof ApiError) || statusCode >= 500) {
    logger.error("Request failed", {
      method: req.method,
      path: req.path,
      statusCode,
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  if (statusCode >= 500) {
    message = "Internal Server Error";
    errors = [];
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};