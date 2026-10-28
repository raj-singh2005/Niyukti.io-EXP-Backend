import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../../../src/database.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../../../../../src/cloud_services/cloudinary.services.js";
import {
  cleanupMentorProfileTempFiles,
  getMentorProfileFiles,
} from "../../../../../src/middlewares/profile_middlewares/mentorMulter.middleware.js";
import { createMentorProfileController } from "../../../../../src/controllers/profiles/mentor_profile/createMentorProfile.controller.js";

vi.mock("../../../../../src/database.js", () => ({
  prisma: {
    mentorProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("../../../../../src/cloud_services/cloudinary.services.js", () => ({
  uploadOnCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(),
}));

vi.mock(
  "../../../../../src/middlewares/profile_middlewares/mentorMulter.middleware.js",
  () => ({
    cleanupMentorProfileTempFiles: vi.fn(),
    getMentorProfileFiles: vi.fn(),
  }),
);

describe("createMentorProfileController", () => {
  const user = {
    id: "mentor-id",
    globalRole: "MENTOR",
  };
  const body = {
    fullName: "Alex Mentor",
    currentCompany: "Example Technologies",
    designation: "Senior Software Engineer",
    yearsOfExperience: 8,
    expertise: ["Backend Engineering", "System Design"],
    linkedinUrl: "https://www.linkedin.com/in/alex-mentor",
  };
  const req = { user, body } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
  const profile = {
    id: "profile-id",
    userId: user.id,
    ...body,
    avatarUrl: "https://res.cloudinary.com/demo/avatar.webp",
    resumeUrl: "https://res.cloudinary.com/demo/resume.pdf",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMentorProfileFiles).mockReturnValue({
      avatar: undefined,
      resume: undefined,
    });
    vi.mocked(cleanupMentorProfileTempFiles).mockResolvedValue();
    vi.mocked(prisma.mentorProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.mentorProfile.create).mockResolvedValue(profile as never);
    vi.mocked(uploadOnCloudinary)
      .mockReset()
      .mockResolvedValueOnce({
        secure_url: profile.avatarUrl,
        public_id: "mentor/avatar",
        resource_type: "image",
      } as never)
      .mockResolvedValueOnce({
        secure_url: profile.resumeUrl,
        public_id: "mentor/resume",
        resource_type: "raw",
      } as never);
    vi.mocked(deleteFromCloudinary).mockResolvedValue({ result: "ok" });
  });

  it("creates the profile with Cloudinary URLs for both optional files", async () => {
    vi.mocked(getMentorProfileFiles).mockReturnValue({
      avatar: { path: "avatar.tmp" } as Express.Multer.File,
      resume: { path: "resume.tmp" } as Express.Multer.File,
    });

    await createMentorProfileController(req, res);

    expect(uploadOnCloudinary).toHaveBeenNthCalledWith(1, "avatar.tmp");
    expect(uploadOnCloudinary).toHaveBeenNthCalledWith(2, "resume.tmp");
    expect(prisma.mentorProfile.create).toHaveBeenCalledWith({
      data: {
        userId: user.id,
        ...body,
        avatarUrl: profile.avatarUrl,
        resumeUrl: profile.resumeUrl,
      },
      select: expect.objectContaining({
        id: true,
        avatarUrl: true,
        resumeUrl: true,
      }),
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Mentor profile created successfully",
        success: true,
        data: profile,
      }),
    );
    expect(cleanupMentorProfileTempFiles).toHaveBeenCalledWith({
      avatar: [{ path: "avatar.tmp" }],
      resume: [{ path: "resume.tmp" }],
    });
  });

  it("returns conflict before uploading when a profile already exists", async () => {
    vi.mocked(prisma.mentorProfile.findUnique).mockResolvedValue({
      id: "existing-profile",
    } as never);

    await expect(
      createMentorProfileController(req, res),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Mentor profile already exists",
    });
    expect(uploadOnCloudinary).not.toHaveBeenCalled();
    expect(prisma.mentorProfile.create).not.toHaveBeenCalled();
  });

  it("rejects non-mentor accounts", async () => {
    const studentRequest = {
      user: { ...user, globalRole: "STUDENT" },
      body,
    } as unknown as Request;

    await expect(
      createMentorProfileController(studentRequest, res),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.mentorProfile.findUnique).not.toHaveBeenCalled();
    expect(prisma.mentorProfile.create).not.toHaveBeenCalled();
  });

  it("deletes an uploaded avatar if the resume upload fails", async () => {
    vi.mocked(getMentorProfileFiles).mockReturnValue({
      avatar: { path: "avatar.tmp" } as Express.Multer.File,
      resume: { path: "resume.tmp" } as Express.Multer.File,
    });
    vi.mocked(uploadOnCloudinary)
      .mockReset()
      .mockResolvedValueOnce({
        secure_url: profile.avatarUrl,
        public_id: "mentor/avatar",
        resource_type: "image",
      } as never)
      .mockResolvedValueOnce(null);

    await expect(
      createMentorProfileController(req, res),
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(deleteFromCloudinary).toHaveBeenCalledWith(
      "mentor/avatar",
      "image",
    );
    expect(prisma.mentorProfile.create).not.toHaveBeenCalled();
  });

  it("cleans up Cloudinary assets if profile persistence fails", async () => {
    vi.mocked(getMentorProfileFiles).mockReturnValue({
      avatar: { path: "avatar.tmp" } as Express.Multer.File,
      resume: undefined,
    });
    vi.mocked(prisma.mentorProfile.create).mockRejectedValue(
      new Error("Database unavailable"),
    );

    await expect(
      createMentorProfileController(req, res),
    ).rejects.toThrow("Database unavailable");
    expect(deleteFromCloudinary).toHaveBeenCalledWith(
      "mentor/avatar",
      "image",
    );
    expect(cleanupMentorProfileTempFiles).toHaveBeenCalled();
  });
});
