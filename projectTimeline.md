# Niyukti.io Backend — Project Timeline and File Inventory

This document records the backend foundation built so far and explains the purpose of each project file. Infrastructure and reusable utilities are distinguished from product workflows that are not implemented yet.

## Repository folder structure

The tree below includes project-owned source, configuration, documentation, and test files. Dependency, generated, runtime-log, and secret/environment files are intentionally omitted.

```text
Niyukti.io-Backend/
├── .agent/
│   └── rules/
│       └── guardrails.md
├── .agent-guardrails/
│   ├── hooks/
│   │   └── test-guardrails.cjs
│   ├── approval-matrix.md
│   ├── policy.md
│   └── README.md
├── .claude/
│   ├── rules/
│   │   └── guardrails.md
│   └── settings.json
├── .cursor/
│   └── rules/
│       └── guardrails.mdc
├── .github/
│   ├── hooks/
│   │   ├── guardrails.cjs
│   │   └── guardrails.json
│   └── copilot-instructions.md
├── .vscode/
│   └── settings.json
├── prisma/
│   ├── migrations/
│   │   ├── 20261015142633_init_niyukti_schema/
│   │   │   └── migration.sql
│   │   ├── 20261016081406_add_refresh_token/
│   │   │   └── migration.sql
│   │   ├── 20261028104210_add_profile_avatar_urls/
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   └── schema.prisma
├── public/
│   └── temp/
│       └── .gitkeep
├── src/
│   ├── auth_utils/
│   │   ├── password.hash.ts
│   │   ├── password.isCorrect.ts
│   │   ├── token.access.ts
│   │   ├── token.refresh.ts
│   │   └── token.service.ts
│   ├── caching/
│   │   └── cacheManager.ts
│   ├── cloud_services/
│   │   └── cloudinary.services.ts
│   ├── config/
│   │   ├── email.config.ts
│   │   └── redis.config.ts
│   ├── controllers/
│   │   ├── auth/
│   │   │   ├── login.controller.ts
│   │   │   ├── sendOtp.controller.ts
│   │   │   ├── forgotPassword.controller.ts
│   │   │   ├── changeRole.controller.ts
│   │   │   ├── signup.controller.ts
│   │   │   ├── token.controller.ts
│   │   │   └── logout.controller.ts
│   │   ├── internships/
│   │   │   ├── project.controller.ts
│   │   │   ├── submission.controller.ts
│   │   │   └── task.controller.ts
│   │   ├── organizations/
│   │   │   ├── member.controller.ts
│   │   │   └── tenant.controller.ts
│   │   ├── practice/
│   │   │   ├── dsa.controller.ts
│   │   │   └── theory.controller.ts
│   │   └── profiles/
│   │       ├── endorsement.controller.ts
│   │       ├── mentor.controller.ts
│   │       └── student.controller.ts
│   ├── docs/
│   │   ├── auth.yaml
│   │   └── swagger.ts
│   ├── logger/
│   │   └── winston.logger.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── helmet.middleware.ts
│   │   └── multer.middleware.ts
│   ├── monitoring/
│   │   └── statusMonitor.ts
│   ├── queues/
│   │   ├── email.queue.ts
│   │   └── queueManager.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── index.routes.ts
│   │   ├── internship.routes.ts
│   │   ├── organization.routes.ts
│   │   ├── practice.routes.ts
│   │   └── profile.routes.ts
│   ├── services/
│   │   └── email.service.ts
│   ├── schemas/
│   │   └── auth.schema.ts
│   ├── templates/
│   │   └── emails/
│   │       └── otp.ejs
│   ├── utils/
│   │   ├── apiError.ts
│   │   ├── apiResponse.ts
│   │   ├── asyncHandler.ts
│   │   ├── cookie.utils.ts
│   │   ├── otpGenerator.ts
│   │   └── shutdown.ts
│   ├── workers/
│   │   └── email.worker.ts
│   ├── types/
│   │   └── auth.types.ts
│   ├── app.ts
│   ├── database.ts
│   ├── envConfig.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   │   ├── auth_utils/
│   │   │   ├── password.hash.spec.ts
│   │   │   └── token.service.spec.ts
│   │   ├── controllers/
│   │   │   └── auth/
│   │   │       ├── changeRole.controller.spec.ts
│   │   │       ├── forgotPassword.controller.spec.ts
│   │   │       ├── login.controller.spec.ts
│   │   │       ├── sendOtp.controller.spec.ts
│   │   │       ├── signup.controller.spec.ts
│   │   │       └── token.controller.spec.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.spec.ts
│   │   │   └── error.middleware.spec.ts
│   │   ├── schemas/
│   │   │   └── auth.schema.spec.ts
│   │   └── utils/
│   │       └── otpGenerator.spec.ts
│   └── load.test.js
├── .gitignore
├── .prettierignore
├── .prettierrc
├── instruction.md
├── package-lock.json
├── package.json
├── prisma.config.ts
├── projectTimeline.md
├── readme.md
├── skills-lock.json
├── tsconfig.json
└── vitest.config.ts
```

## Project foundation and configuration

- `package.json` — Declares the Node.js dependencies and scripts for development, build, start, and Vitest.
- `package-lock.json` — Locks exact dependency versions for reproducible npm installs.
- `tsconfig.json` — Configures strict TypeScript compilation from `src/` into `dist/`.
- `vitest.config.ts` — Configures Vitest to run the unit-test specifications and collect coverage.
- `.prettierrc` — Defines the repository's Prettier formatting preferences.
- `.prettierignore` — Lists files and folders Prettier should skip.
- `.gitignore` — Excludes local environment files, dependencies, build output, logs, and other generated/local content from Git.
- `skills-lock.json` — Records the versions/hashes of project-linked Prisma skills.
- `prisma.config.ts` — Configures Prisma CLI to use the schema and the direct database connection environment variable.
- `instruction.md` — Developer setup, environment configuration, coding conventions, and AI-agent guardrail guidance.
- `readme.md` — Project overview and developer-facing setup information.
- `projectTimeline.md` — This progress summary and file-by-file inventory.

## Prisma schema and migrations

- `prisma/schema.prisma` — Defines the PostgreSQL data model, including users, student/mentor profiles, organizations, projects, internships, tasks, endorsements, and practice questions.
- `prisma/migrations/migration_lock.toml` — Records the database provider used by Prisma migrations.
- `prisma/migrations/20261015142633_init_niyukti_schema/migration.sql` — Creates the initial tables, indexes, relations, and constraints for the first schema version.
- `prisma/migrations/20261016081406_add_refresh_token/migration.sql` — Adds the refresh-token column to the user table.
- `prisma/migrations/20261028104210_add_profile_avatar_urls/migration.sql` — Adds nullable Cloudinary avatar URL columns to student and mentor profiles. This migration file has been created but has not yet been applied to the database.

## Application entry points and environment

- `src/server.ts` — Connects the application to PostgreSQL, starts the Express listener, and registers graceful-shutdown handling.
- `src/app.ts` — Creates the Express app, installs middleware, mounts health and test-email endpoints, and configures Swagger.
- `src/envConfig.ts` — Loads `.env` values and exposes validated application configuration; it throws when required variables are missing.
- `src/database.ts` — Creates and exports the shared Prisma Client configured with the Neon adapter.

## API middleware and common utilities

- `src/middlewares/auth.middleware.ts` — Verifies access JWTs and attaches the corresponding user to the request.
- `src/middlewares/error.middleware.ts` — Formats errors into the application's JSON error response shape.
- `src/middlewares/helmet.middleware.ts` — Configures Helmet security-related HTTP headers.
- `src/middlewares/multer.middleware.ts` — Configures disk-based multipart uploads and a file-size limit.
- `src/utils/apiError.ts` — Defines the application's structured API error type and common status-code factories.
- `src/utils/apiResponse.ts` — Defines the standard success response shape and helper factories.
- `src/utils/asyncHandler.ts` — Forwards rejected async Express handlers to the error middleware.
- `src/utils/cookie.utils.ts` — Defines cookie options for access/refresh tokens and clearing cookies.
- `src/utils/otpGenerator.ts` — Generates cryptographically random numeric or alphanumeric OTP values.
- `src/utils/shutdown.ts` — Closes HTTP, BullMQ, Redis, and Prisma resources during graceful shutdown, with a fallback timeout.

## Authentication building blocks

- `src/auth_utils/password.hash.ts` — Hashes passwords with bcrypt.
- `src/auth_utils/password.isCorrect.ts` — Compares a plaintext password with a stored bcrypt hash.
- `src/auth_utils/token.access.ts` — Creates signed access JWTs.
- `src/auth_utils/token.refresh.ts` — Creates signed refresh JWTs.
- `src/auth_utils/token.service.ts` — Persists refresh tokens and implements refresh-token validation/rotation.

## Implemented authentication flows

- Signup creates a user with the default `ONBOARDING` global role and stores a bcrypt password hash.
- Login uses a password-verified email OTP flow: `POST /api/v1/auth/send-otp` queues the code and `POST /api/v1/auth/login` consumes it and sets HttpOnly access/refresh cookies.
- Password reset uses `POST /api/v1/auth/forgot-password/request` and `POST /api/v1/auth/forgot-password/reset`. Reset codes use distinct Redis keys, expire after 10 minutes, and have a 40-second resend cooldown. A successful reset hashes the new password and revokes the stored refresh token.
- `PATCH /api/v1/auth/change-role` lets an authenticated `ONBOARDING` user select `STUDENT` or `MENTOR` once. The endpoint updates only the current authenticated user.
- `POST /api/v1/auth/refresh-token` rotates the refresh token; `POST /api/v1/auth/logout` revokes the current refresh token and clears authentication cookies.
- Access tokens can remain valid until expiry after logout or password reset; they are not immediately revoked.
- Login and password-reset OTP verification currently have no wrong-attempt limit. Request endpoints enforce a 40-second cooldown per account.

## Routes and controllers

The authentication routes and controllers below are implemented. Other route/controller files remain planned or partial product areas; a schema model or controller file does not by itself mean the related API workflow is available.

- `src/routes/auth.routes.ts` — Wires signup, OTP login, password reset, one-time role selection, refresh, and logout endpoints.
- `src/routes/index.routes.ts` — Mounts the API route modules.
- `src/routes/internship.routes.ts` — Placeholder for internship-related routes.
- `src/routes/organization.routes.ts` — Placeholder for organization-related routes.
- `src/routes/practice.routes.ts` — Placeholder for practice-zone routes.
- `src/routes/profile.routes.ts` — Placeholder for profile-related routes.
- `src/controllers/auth/login.controller.ts` — Verifies login credentials and OTP, then issues authentication cookies.
- `src/controllers/auth/signup.controller.ts` — Validates and creates a user account.
- `src/controllers/auth/sendOtp.controller.ts` — Validates credentials, stores a login OTP, and queues its email.
- `src/controllers/auth/forgotPassword.controller.ts` — Requests and verifies password-reset OTPs, updates the password, and revokes the stored refresh token.
- `src/controllers/auth/changeRole.controller.ts` — Allows a one-time `ONBOARDING` to `STUDENT` or `MENTOR` transition for the authenticated user.
- `src/controllers/auth/token.controller.ts` — Rotates access and refresh tokens.
- `src/controllers/auth/logout.controller.ts` — Revokes the refresh token and clears authentication cookies.
- `src/controllers/internships/project.controller.ts` — Placeholder for project request handling.
- `src/controllers/internships/submission.controller.ts` — Placeholder for project-submission request handling.
- `src/controllers/internships/task.controller.ts` — Placeholder for internship-task request handling.
- `src/controllers/organizations/member.controller.ts` — Placeholder for organization-member request handling.
- `src/controllers/organizations/tenant.controller.ts` — Placeholder for organization request handling.
- `src/controllers/practice/dsa.controller.ts` — Placeholder for DSA practice request handling.
- `src/controllers/practice/theory.controller.ts` — Placeholder for theory practice request handling.
- `src/controllers/profiles/endorsement.controller.ts` — Placeholder for endorsement request handling.
- `src/controllers/profiles/mentor.controller.ts` — Placeholder for mentor-profile request handling.
- `src/controllers/profiles/student.controller.ts` — Placeholder for student-profile request handling.

## Redis, caching, email, and media services

- `src/config/redis.config.ts` — Creates the shared Redis connection and logs connection events.
- `src/caching/cacheManager.ts` — Provides JSON cache get/set/delete methods with TTL support.
- `src/queues/queueManager.ts` — Centralizes BullMQ queue creation and default retry/job options.
- `src/queues/email.queue.ts` — Creates the email-processing queue through `QueueManager`.
- `src/config/email.config.ts` — Configures Nodemailer using the application's SMTP credentials.
- `src/services/email.service.ts` — Renders the OTP email template and adds an email job to BullMQ.
- `src/templates/emails/otp.ejs` — HTML template used for OTP emails.
- `src/workers/email.worker.ts` — Processes email jobs and sends messages using Nodemailer.
- `src/cloud_services/cloudinary.services.ts` — Configures Cloudinary and provides upload, delete, and public-ID helper functions.
- `StudentProfile.avatarUrl` and `MentorProfile.avatarUrl` — Optional profile fields intended to store Cloudinary image URLs. Profile-image upload/update endpoints are not yet documented as implemented.

## API documentation, monitoring, and logging

- `src/docs/swagger.ts` — Builds the OpenAPI specification and mounts Swagger UI at `/api-docs`.
- `src/monitoring/statusMonitor.ts` — Configures the Express server status dashboard.
- `src/logger/winston.logger.ts` — Configures file and development-console logging with Winston.

## Tests

- `tests/unit/utils/otpGenerator.spec.ts` — Checks OTP format, configurable length/type, and a basic uniqueness expectation.
- `tests/unit/auth_utils/password.hash.spec.ts` — Mocks bcrypt and tests successful password hashing and error behavior.
- `tests/unit/auth_utils/token.service.spec.ts` — Tests refresh-token storage, validation, rotation, and revocation behavior.
- `tests/unit/controllers/auth/` — Contains focused tests for signup, login OTP, password reset, one-time role selection, and refresh-token behavior.
- `tests/unit/schemas/auth.schema.spec.ts` — Tests authentication request validation and normalization.
- `tests/unit/middlewares/` — Tests authentication and error middleware behavior.
- `tests/load.test.js` — k6 script for issuing repeated HTTP requests to the local service.
- `.agent-guardrails/hooks/test-guardrails.cjs` — Sends synthetic tool events to the shared hook and checks the resulting decisions.

## AI-agent policies and integrations

- `.agent-guardrails/README.md` — Describes the shared guardrail files, platform entry points, and enforcement limitations.
- `.agent-guardrails/policy.md` — Shared policy covering approvals, workspace boundaries, deletion, commands, databases, Git, and secrets.
- `.agent-guardrails/approval-matrix.md` — Quick reference of which actions require approval or are prohibited.
- `.github/copilot-instructions.md` — Repository-wide Copilot instructions pointing to the shared policy.
- `.github/hooks/guardrails.json` — VS Code Local-agent hook configuration.
- `.github/hooks/guardrails.cjs` — Shared hook script that decides whether synthetic/tool requests are allowed, require approval, or are denied.
- `.claude/rules/guardrails.md` — Claude Code project guidance pointing to the shared policy.
- `.claude/settings.json` — Claude Code project hook configuration.
- `.cursor/rules/guardrails.mdc` — Cursor project rule pointing to the shared policy.
- `.agent/rules/guardrails.md` — Antigravity project guidance pointing to the shared policy.
- `.vscode/settings.json` — Enables VS Code agent hooks for the workspace.

## Current implementation status

The backend foundation and core authentication lifecycle are implemented, including signup, email-OTP login, password reset, refresh-token rotation, logout, and one-time student/mentor role selection. The Prisma schema includes optional avatar URL fields for student and mentor profiles, with a migration file prepared; the developer must apply that migration and regenerate Prisma Client before using those fields against the database. Broader profile, organization, internship, project, and practice workflows remain in development; schema models do not by themselves mean those APIs are available.

The developer has manually tested the email workflow and confirmed delivery to an inbox. Build, unit-test, and synthetic hook-test results are point-in-time checks and should be rerun after relevant changes. Synthetic hook tests do not prove that each agent platform loads or enforces the hook in a live session.
