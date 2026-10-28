# Developer Instructions

## Project setup

1. Install the supported Node.js LTS release and npm.
2. Install dependencies from the repository root:
   ```sh
   npm install
   ```
3. Create a `.env` file in the repository root. `src/envConfig.ts` loads it with `dotenv` and requires the configuration listed below. Use your own service credentials; never commit `.env`.
4. Configure both PostgreSQL URLs:
   - `DATABASE_URL` is used by the application through the Neon Prisma adapter. Use the pooled application connection string.
   - `DIRECT_URL` is used by Prisma CLI commands in `prisma.config.ts`. Use the direct/unpooled connection string.
5. Ensure PostgreSQL and Redis are reachable, and configure the SMTP and Cloudinary credentials before starting the server. Configuration is validated as modules load, so missing required values can prevent the app from starting.
6. Apply pending migrations to your development database, then generate the Prisma Client:
   ```sh
   npx prisma migrate dev
   npx prisma generate
   ```

## Environment configuration

`src/envConfig.ts` loads environment variables from the root `.env` file and exports the shared `config` object. Required variables are checked when the module loads; missing values throw an error. Add new application environment settings there rather than reading `process.env` throughout feature code.

Required variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL connection used by the application |
| `DIRECT_URL` | Direct PostgreSQL connection used by Prisma CLI configuration |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `REDIS_URL` | Redis connection URL used by Redis and BullMQ |
| `SMTP_USER` | SMTP/Gmail account used to send email |
| `SMTP_PASS` | SMTP/Gmail app password or provider credential |
| `ACCESS_TOKEN_SECRET` | Secret used to sign access tokens |
| `ACCESS_TOKEN_EXPIRY` | Access-token lifetime accepted by `jsonwebtoken` |
| `REFRESH_TOKEN_SECRET` | Secret used to sign refresh tokens |
| `REFRESH_TOKEN_EXPIRY` | Refresh-token lifetime accepted by `jsonwebtoken` |

PORT and NODE_ENV are optional in envConfig.ts. If PORT is unset, the application defaults to port 5000 uniformly across the project. Set PORT explicitly when a different port is required.

Do not put real credentials in documentation, source code, logs, tests, or commits. The repository `.gitignore` excludes `.env`; verify that secrets are not staged before committing.

## Starting and checking the app

Start the development server with automatic restarts:

```sh
npm run dev
```

Build and start the compiled application with:

```sh
npm run build
npm start
```

Run the unit tests with:

```sh
npm test
```

The server connects to PostgreSQL during startup and initializes Redis/BullMQ components. Make sure the required services and environment variables are available before starting it. The health endpoint is `/health`; Swagger UI is at `/api-docs`. Treat test-only endpoints as development-only and remove or protect them before exposing a deployment.

## Current authentication API

Authentication routes are mounted under `/api/v1/auth`:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/signup` | Create an account with the `ONBOARDING` role |
| `POST` | `/send-otp` | Request a login OTP after password verification |
| `POST` | `/login` | Verify the login OTP and set auth cookies |
| `POST` | `/forgot-password/request` | Request a password-reset OTP |
| `POST` | `/forgot-password/reset` | Verify the reset OTP, change the password, and revoke the refresh token |
| `PATCH` | `/change-role` | Authenticated `ONBOARDING` user chooses `STUDENT` or `MENTOR` once |
| `POST` | `/refresh-token` | Rotate the refresh token |
| `POST` | `/logout` | Revoke the refresh token and clear auth cookies |

Use the `globalRole` returned by login to determine whether the frontend should show role selection. A role of `ONBOARDING` means the user has not selected a role yet. Role selection is one-time. Logout and password reset revoke refresh tokens, but an already issued access token may remain valid until its expiry. Login and reset OTPs currently have no wrong-attempt limit.

## Profile avatar schema migration

`StudentProfile` and `MentorProfile` now have nullable `avatarUrl` fields for Cloudinary URLs. The migration file is `prisma/migrations/20261028104210_add_profile_avatar_urls/migration.sql`. It has been created but has not been applied to the database. The developer must apply it and regenerate Prisma Client before using these fields against the database:

```sh
npx prisma migrate dev
npx prisma generate
```

AI agents must not run these commands or otherwise operate on the database; the developer performs database operations manually.

## Code organization and implementation

- Read the relevant files and follow existing project patterns before making changes.
- Check whether a feature already has a route, controller, service, middleware, or utility before adding another. Empty placeholder files do not mean a feature is implemented.
- Keep routes focused on endpoint wiring. Keep controllers focused on HTTP input/output; put reusable business logic in services.
- Validate and normalize request input before using it.
- Use the shared Prisma client exported from `src/database.ts`. Do not create another `PrismaClient`.
- Use the shared `ApiError`, `ApiResponse`, and `asyncHandler` utilities where appropriate.
- Add new application environment variables to `src/envConfig.ts` and document their purpose without including their values.

## Database changes

- Update `prisma/schema.prisma` for data-model changes.
- Create a Prisma migration for schema changes; do not edit an already-applied migration to change database history.
- Use the configured direct database URL for Prisma CLI operations.
- Consider constraints, relations, indexes, and delete behavior when adding or changing models.

## Security and sensitive data

- Never commit `.env`, credentials, tokens, or real user data.
- Do not log passwords, OTPs, access tokens, or refresh tokens.
- Validate uploads by type and size, and do not make temporary uploads publicly accessible.
- Remove or protect test-only endpoints before deployment.
- Do not return internal error details or stack traces to clients in production.

## Testing and handoff

- Add or update tests for new behavior, especially validation, error cases, and authentication flows.
- Before handing off a change, run `npm test` and `npm run build`.
- Mention any checks that could not be run.
- Avoid unrelated refactors and dependency changes; add abstractions when they solve a real repeated need.
- Update documentation when a change affects setup, behavior, or developer workflow.

## AI agent guardrails

This repository includes shared AI-agent rules in `.agent-guardrails/policy.md` and `.agent-guardrails/approval-matrix.md`. Read those before using an AI coding agent on this project.

The rules require approval before changes, commands, and Git operations; prohibit agents from deleting project files, operating on a database, or pushing; and prohibit access to secrets and paths outside the repository. Read-only access to ordinary project files is allowed. These rules apply to contributors using AI tools, not just the original developer.

### Agent configuration

The repository has platform-specific entry points:

- **GitHub Copilot in VS Code:** `.github/copilot-instructions.md`
- **VS Code Local agent hooks:** `.github/hooks/guardrails.json` and `.github/hooks/guardrails.cjs`
- **Claude Code:** `.claude/rules/guardrails.md` and `.claude/settings.json`
- **Cursor:** `.cursor/rules/guardrails.mdc`
- **Antigravity:** `.agent/rules/guardrails.md`

For VS Code, open the repository as a trusted workspace and ensure `chat.useHooks` is enabled in `.vscode/settings.json`. Hook support depends on the selected agent harness and VS Code version.

For Claude Code, use a version that supports project rules and hooks, and review/approve the project hook configuration when prompted.

Cursor and Antigravity have project rule files, but those files provide instructions; they are not confirmed blocking hooks in every version. Check the documentation and permission settings for the specific installed version before relying on enforcement.

### Test the shared hook

Run the synthetic hook checks from the repository root:

```sh
node .agent-guardrails/hooks/test-guardrails.cjs
```

The test checks that a recognized read-only tool is allowed, a normal command asks for approval, recognizable push/database/destructive commands are denied, and malformed input fails closed. It does not connect to a database, modify Git, or prove that a live agent platform has loaded the hook.

### Important limitations

These repository files are guardrails, not an unbypassable security boundary. Instructions guide agent behavior, while hooks can only control operations supported by the host tool. Tool names and hook behavior may differ across platforms and versions. For stronger restrictions, configure each platform's permissions and restrict agent access to databases, secrets, network, and files outside this repository. Never provide an agent with database credentials if it must not access a database.