import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../database.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../../../cloud_services/cloudinary.services.js";
import { logger } from "../../../logger/winston.logger.js";
import {
  cleanupMentorProfileTempFiles,
  getMentorProfileFiles,
} from "../../../middlewares/profile_middlewares/mentorMulter.middleware.js";
import type { CreateMentorProfileInput } from "../../../types/profile.types.js";
import { ApiError } from "../../../utils/apiError.js";
import { ApiResponse } from "../../../utils/apiResponse.js";

type UploadedCloudinaryAsset = {
  publicId: string;
  resourceType: "image" | "video" | "raw";
};

const isCloudinaryResourceType = (
  value: string,
): value is UploadedCloudinaryAsset["resourceType"] =>
  value === "image" || value === "video" || value === "raw";

const cleanupCloudinaryAssets = async (
  assets: UploadedCloudinaryAsset[],
): Promise<void> => {
  for (const asset of assets) {
    const result = await deleteFromCloudinary(
      asset.publicId,
      asset.resourceType,
    );
    if (result === null) {
      logger.error("Failed to clean up uploaded mentor profile asset", {
        publicId: asset.publicId,
      });
    }
  }
};

export const createMentorProfileController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const files = getMentorProfileFiles(req);
  const fileFields = {
    avatar: files.avatar ? [files.avatar] : undefined,
    resume: files.resume ? [files.resume] : undefined,
  };
  const uploadedAssets: UploadedCloudinaryAsset[] = [];

  try {
    const user = req.user;
    if (!user) {
      throw ApiError.unauthorized("Authentication is required");
    }
    if (user.globalRole !== "MENTOR") {
      throw ApiError.forbidden("Only mentor accounts can create mentor profiles");
    }

    const existingProfile = await prisma.mentorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (existingProfile) {
      throw ApiError.conflict("Mentor profile already exists");
    }

    const {
      fullName,
      currentCompany,
      designation,
      yearsOfExperience,
      expertise,
      linkedinUrl,
    } = req.body as CreateMentorProfileInput;
    let avatarUrl: string | null = null;
    let resumeUrl: string | null = null;

    for (const [file, fieldName] of [
      [files.avatar, "avatar"],
      [files.resume, "resume"],
    ] as const) {
      if (!file) continue;

      const upload = await uploadOnCloudinary(file.path);
      if (!upload) {
        throw ApiError.internal(`Unable to upload mentor profile ${fieldName}`);
      }

      if (isCloudinaryResourceType(upload.resource_type)) {
        uploadedAssets.push({
          publicId: upload.public_id,
          resourceType: upload.resource_type,
        });
      } else {
        throw ApiError.internal("Cloudinary returned an unsupported asset type");
      }

      if (!upload.secure_url || !upload.public_id) {
        throw ApiError.internal("Cloudinary returned incomplete upload details");
      }

      if (fieldName === "avatar") avatarUrl = upload.secure_url;
      if (fieldName === "resume") resumeUrl = upload.secure_url;
    }

    const profile = await prisma.mentorProfile.create({
      data: {
        userId: user.id,
        fullName,
        currentCompany,
        designation,
        yearsOfExperience,
        expertise,
        linkedinUrl,
        avatarUrl,
        resumeUrl,
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        currentCompany: true,
        designation: true,
        yearsOfExperience: true,
        expertise: true,
        linkedinUrl: true,
        avatarUrl: true,
        resumeUrl: true,
      },
    });

    res
      .status(201)
      .json(ApiResponse.created(profile, "Mentor profile created successfully"));
  } catch (error) {
    await cleanupCloudinaryAssets(uploadedAssets);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw ApiError.conflict("Mentor profile already exists");
    }
    throw error;
  } finally {
    await cleanupMentorProfileTempFiles(fileFields);
  }
};
