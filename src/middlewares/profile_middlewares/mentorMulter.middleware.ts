import multer from "multer";
import path from "path";
import { randomUUID } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import type { Request, RequestHandler } from "express";
import { ApiError } from "../../utils/apiError.js";
import { logger } from "../../logger/winston.logger.js";
import { createMentorProfileSchema } from "../../schemas/profile.schema.js";
import type { MentorProfileFileFields } from "../../types/profile.types.js";

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const RESUME_MAX_BYTES = 10 * 1024 * 1024;
const TEMP_DIRECTORY = path.resolve(".tmp/mentor-profile");

const fileExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    void mkdir(TEMP_DIRECTORY, { recursive: true })
      .then(() => callback(null, TEMP_DIRECTORY))
      .catch((error: Error) => callback(error, TEMP_DIRECTORY));
  },
  filename: (_req, file, callback) => {
    callback(null, `${randomUUID()}${fileExtensions[file.mimetype] ?? ""}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  const isAvatarType =
    file.fieldname === "avatar" &&
    ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
  const isResumeType =
    file.fieldname === "resume" && file.mimetype === "application/pdf";

  if (!isAvatarType && !isResumeType) {
    callback(ApiError.badRequest("Unsupported profile upload field or file type"));
    return;
  }

  callback(null, true);
};

const multerFields = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: RESUME_MAX_BYTES,
    files: 2,
    fields: 6,
    parts: 8,
    fieldSize: 64 * 1024,
  },
}).fields([
  { name: "avatar", maxCount: 1 },
  { name: "resume", maxCount: 1 },
]);

const getFileFields = (req: Request): MentorProfileFileFields => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return {
    avatar: files?.avatar,
    resume: files?.resume,
  };
};

export const getMentorProfileFiles = (req: Request) => {
  const fields = getFileFields(req);
  return {
    avatar: fields.avatar?.[0],
    resume: fields.resume?.[0],
  };
};

export const cleanupMentorProfileTempFiles = async (
  fields: MentorProfileFileFields,
): Promise<void> => {
  const files = [...(fields.avatar ?? []), ...(fields.resume ?? [])];
  const cleanupResults = await Promise.allSettled(
    files.map((file) => unlink(file.path)),
  );

  for (const result of cleanupResults) {
    if (
      result.status === "rejected" &&
      !(result.reason instanceof Error && "code" in result.reason &&
        result.reason.code === "ENOENT")
    ) {
      logger.error("Failed to remove mentor profile temporary upload", {
        error:
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown file cleanup error",
      });
    }
  }
};

export const validateMentorProfileFile = (
  fieldName: string,
  mimeType: string,
  size: number,
  signature: Buffer,
): void => {
  if (fieldName === "avatar" && size > AVATAR_MAX_BYTES) {
    throw new ApiError(413, "Avatar must be no larger than 5 MB");
  }
  if (fieldName === "resume" && size > RESUME_MAX_BYTES) {
    throw new ApiError(413, "Resume must be no larger than 10 MB");
  }

  const isJpeg =
    mimeType === "image/jpeg" &&
    signature.length >= 3 &&
    signature[0] === 0xff &&
    signature[1] === 0xd8 &&
    signature[2] === 0xff;
  const isPng =
    mimeType === "image/png" &&
    signature.length >= 8 &&
    signature.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  const isWebp =
    mimeType === "image/webp" &&
    signature.length >= 12 &&
    signature.toString("ascii", 0, 4) === "RIFF" &&
    signature.toString("ascii", 8, 12) === "WEBP";
  const isPdf =
    fieldName === "resume" &&
    mimeType === "application/pdf" &&
    signature.toString("ascii", 0, 5) === "%PDF-";

  if (
    (fieldName === "avatar" && !(isJpeg || isPng || isWebp)) ||
    (fieldName === "resume" && !isPdf)
  ) {
    throw ApiError.badRequest("Uploaded file content does not match its allowed type");
  }
};

const validateFileContent = async (
  file: Express.Multer.File,
): Promise<void> => {
  const handle = await open(file.path, "r");
  const signature = Buffer.alloc(12);
  try {
    const { bytesRead } = await handle.read(signature, 0, signature.length, 0);
    validateMentorProfileFile(
      file.fieldname,
      file.mimetype,
      file.size,
      signature.subarray(0, bytesRead),
    );
  } finally {
    await handle.close();
  }
};

const formatValidationErrors = (
  issues: Array<{ path: PropertyKey[]; message: string }>,
) => {
  const errors = issues.map((issue) => ({
    field: ["body", ...issue.path].join("."),
    message: issue.message,
  }));
  const message = errors
    .map((error) => `${error.field}: ${error.message}`)
    .join(", ");
  return ApiError.badRequest(`Validation failed: ${message}`, errors);
};

export const mentorMulter: RequestHandler = (req, res, next) => {
  void mkdir(TEMP_DIRECTORY, { recursive: true })
    .then(() => {
      multerFields(req, res, (multerError) => {
        void (async () => {
          const fileFields = getFileFields(req);
          if (multerError) {
            await cleanupMentorProfileTempFiles(fileFields);
            next(multerError);
            return;
          }

          try {
            const files = getMentorProfileFiles(req);
            for (const file of [files.avatar, files.resume]) {
              if (file) await validateFileContent(file);
            }

            const parsedBody = createMentorProfileSchema.safeParse(req.body);
            if (!parsedBody.success) {
              throw formatValidationErrors(parsedBody.error.issues);
            }

            req.body = parsedBody.data;
            next();
          } catch (error) {
            await cleanupMentorProfileTempFiles(fileFields);
            next(error);
          }
        })();
      });
    })
    .catch(next);
};
