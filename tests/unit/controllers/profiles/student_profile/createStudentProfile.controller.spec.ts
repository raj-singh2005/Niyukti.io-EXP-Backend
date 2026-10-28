import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../../../src/database.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../../../../../src/cloud_services/cloudinary.services.js";
import {
  cleanupStudentProfileTempFiles,
  getStudentProfileFiles,
} from "../../../../../src/middlewares/profile_middlewares/studentMulter.middleware.js";
import { createStudentProfileController } from "../../../../../src/controllers/profiles/student_profile/createStudentProfile.controller.js";

vi.mock("../../../../../src/database.js", () => ({
  prisma: {
    studentProfile: {
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
  "../../../../../src/middlewares/profile_middlewares/studentMulter.middleware.js",
  () => ({
    cleanupStudentProfileTempFiles: vi.fn(),
    getStudentProfileFiles: vi.fn(),
  }),
);

describe("createStudentProfileController", () => {
  const user = {
    id: "student-id",
    globalRole: "STUDENT",
  };
  const body = {
    fullName: "Alex Student",
    collegeName: "Example University",
    degree: "B.Tech",
    major: "Computer Science",
    graduationYear: 2027,
    interestSummary: "Interested in backend development.",
    skills: ["TypeScript", "PostgreSQL"],
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
    vi.mocked(getStudentProfileFiles).mockReturnValue({
      avatar: undefined,
      resume: undefined,
    });
    vi.mocked(cleanupStudentProfileTempFiles).mockResolvedValue();
    vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.studentProfile.create).mockResolvedValue(profile as never);
    vi.mocked(uploadOnCloudinary)
      .mockResolvedValueOnce({
        secure_url: profile.avatarUrl,
        public_id: "student/avatar",
        resource_type: "image",
      } as never)
      .mockResolvedValueOnce({
        secure_url: profile.resumeUrl,
        public_id: "student/resume",
        resource_type: "raw",
      } as never);
    vi.mocked(deleteFromCloudinary).mockResolvedValue({ result: "ok" });
  });

  it("creates the profile with Cloudinary URLs for both optional files", async () => {
    vi.mocked(getStudentProfileFiles).mockReturnValue({
      avatar: { path: "avatar.tmp" } as Express.Multer.File,
      resume: { path: "resume.tmp" } as Express.Multer.File,
    });

    await createStudentProfileController(req, res);

    expect(uploadOnCloudinary).toHaveBeenNthCalledWith(1, "avatar.tmp");
    expect(uploadOnCloudinary).toHaveBeenNthCalledWith(2, "resume.tmp");
    expect(prisma.studentProfile.create).toHaveBeenCalledWith({
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
        message: "Student profile created successfully",
        success: true,
        data: profile,
      }),
    );
    expect(cleanupStudentProfileTempFiles).toHaveBeenCalledWith({
      avatar: [{ path: "avatar.tmp" }],
      resume: [{ path: "resume.tmp" }],
    });
  });

  it("returns conflict before uploading when a profile already exists", async () => {
    vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue({
      id: "existing-profile",
    } as never);

    await expect(
      createStudentProfileController(req, res),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Student profile already exists",
    });
    expect(uploadOnCloudinary).not.toHaveBeenCalled();
    expect(prisma.studentProfile.create).not.toHaveBeenCalled();
  });

  it("rejects non-student accounts", async () => {
    const mentorRequest = {
      user: { ...user, globalRole: "MENTOR" },
      body,
    } as unknown as Request;

    await expect(
      createStudentProfileController(mentorRequest, res),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.studentProfile.findUnique).not.toHaveBeenCalled();
    expect(prisma.studentProfile.create).not.toHaveBeenCalled();
  });

  it("deletes an already uploaded avatar if the resume upload fails", async () => {
    vi.mocked(getStudentProfileFiles).mockReturnValue({
      avatar: { path: "avatar.tmp" } as Express.Multer.File,
      resume: { path: "resume.tmp" } as Express.Multer.File,
    });
    vi.mocked(uploadOnCloudinary)
      .mockReset()
      .mockResolvedValueOnce({
        secure_url: profile.avatarUrl,
        public_id: "student/avatar",
        resource_type: "image",
      } as never)
      .mockResolvedValueOnce(null);

    await expect(
      createStudentProfileController(req, res),
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(deleteFromCloudinary).toHaveBeenCalledWith(
      "student/avatar",
      "image",
    );
    expect(prisma.studentProfile.create).not.toHaveBeenCalled();
  });

  it("cleans up Cloudinary assets if profile persistence fails", async () => {
    vi.mocked(getStudentProfileFiles).mockReturnValue({
      avatar: { path: "avatar.tmp" } as Express.Multer.File,
      resume: undefined,
    });
    vi.mocked(prisma.studentProfile.create).mockRejectedValue(
      new Error("Database unavailable"),
    );

    await expect(
      createStudentProfileController(req, res),
    ).rejects.toThrow("Database unavailable");
    expect(deleteFromCloudinary).toHaveBeenCalledWith(
      "student/avatar",
      "image",
    );
    expect(cleanupStudentProfileTempFiles).toHaveBeenCalled();
  });
});
