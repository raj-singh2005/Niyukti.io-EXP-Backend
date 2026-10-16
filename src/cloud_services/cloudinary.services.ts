import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { config } from "../envConfig.js";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export const uploadOnCloudinary = async (
  localFilePath: string
): Promise<UploadApiResponse | null> => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // Non-blocking asynchronous deletion
    if (existsSync(localFilePath)) {
      await unlink(localFilePath);
    }

    return response;
  } catch (error) {
    if (localFilePath && existsSync(localFilePath)) {
      await unlink(localFilePath);
    }
    return null;
  }
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
    console.error("Cloudinary file deletion failed:", error);
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
    console.error("Failed to extract Cloudinary public ID:", error);
    return null;
  }
};