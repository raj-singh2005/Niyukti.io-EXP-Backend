export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly success: boolean;
  public readonly errors: unknown[];
  public readonly isOperational: boolean;
  public readonly data: null;

  constructor(
    statusCode: number,
    message: string = "Something went wrong",
    errors: unknown[] = [],
    stack: string = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Pre-configured static factories for standard status codes
  static badRequest(message: string = "Bad Request", errors: unknown[] = []): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message: string = "Unauthorized access"): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message: string = "Forbidden access"): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message: string = "Resource not found"): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string = "Resource already exists"): ApiError {
    return new ApiError(409, message);
  }

  static internal(message: string = "Internal Server Error"): ApiError {
    return new ApiError(500, message);
  }
}