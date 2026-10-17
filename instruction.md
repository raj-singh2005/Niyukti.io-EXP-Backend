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
6. Generate the Prisma Client and apply pending migrations to your development database:
   ```sh
   npx prisma generate
   npx prisma migrate dev
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

`PORT` and `NODE_ENV` are optional in `envConfig.ts`. Note that `src/server.ts` currently defaults its listening port to `5050` when `PORT` is unset, while `envConfig.ts` defaults `config.port` to `5000`; keep this behavior in mind and set `PORT` explicitly when the desired port matters.

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