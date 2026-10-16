export class ApiResponse<T = unknown> {
  public readonly statusCode: number;
  public readonly data: T;
  public readonly message: string;
  public readonly success: boolean;

  constructor(statusCode: number, data: T, message: string = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }

  // Factory methods for standardized payload creation
  static success<T>(data: T, message: string = "Request successful"): ApiResponse<T> {
    return new ApiResponse(200, data, message);
  }

  static created<T>(data: T, message: string = "Resource created successfully"): ApiResponse<T> {
    return new ApiResponse(201, data, message);
  }
}