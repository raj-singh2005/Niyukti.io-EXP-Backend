import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { config } from "../envConfig.js";
import { logger } from "../logger/winston.logger.js";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export const uploadOnCloudinary = async (
  localFilePath: string
): Promise<UploadApiResponse | null> => {
  if (!localFilePath) return null;

  let response: UploadApiResponse;
  try {
    response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
  } catch (error) {
    logger.error("Cloudinary upload failed", {
      error: error instanceof Error ? error.message : "Unknown Cloudinary error",
    });
    if (localFilePath) {
      try {
        if (existsSync(localFilePath)) {
          await unlink(localFilePath);
        }
      } catch (cleanupError) {
        logger.error("Failed to remove local file after Cloudinary upload failure", {
          error:
            cleanupError instanceof Error
              ? cleanupError.message
              : "Unknown file cleanup error",
        });
      }
    }
    return null;
  }

  try {
    if (existsSync(localFilePath)) {
      await unlink(localFilePath);
    }
  } catch (cleanupError) {
    logger.error("Failed to remove local file after Cloudinary upload", {
      error:
        cleanupError instanceof Error
          ? cleanupError.message
          : "Unknown file cleanup error",
    });
  }

  return response;
};

export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: "image" | "video" | "raw" | "auto" = "image"
): Promise<unknown | null> => {
  try {
    if (!publicId) return null;

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return result;
  } catch (error) {
    logger.error("Cloudinary file deletion failed", {
      error: error instanceof Error ? error.message : "Unknown Cloudinary error",
    });
    return null;
  }
};

export const extractPublicId = (url: string): string | null => {
  if (!url) return null;

  try {
    const uploadSplit = url.split("/upload/");
    if (uploadSplit.length < 2) return null;

    let pathAndFile = uploadSplit[1];

    // Safely remove the versioning folder (e.g., 'v1692345/') if it exists
    if (pathAndFile.match(/^v\d+\//)) {
      pathAndFile = pathAndFile.replace(/^v\d+\//, "");
    }

    // Strip the file extension correctly regardless of folder depth
    const publicId =
      pathAndFile.substring(0, pathAndFile.lastIndexOf(".")) || pathAndFile;

    return publicId;
  } catch (error) {
    logger.error("Failed to extract Cloudinary public ID", {
      error: error instanceof Error ? error.message : "Unknown URL parsing error",
    });
    return null;
  }
};