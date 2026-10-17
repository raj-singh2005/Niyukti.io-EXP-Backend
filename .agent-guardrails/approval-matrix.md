# Approval Matrix

| Action | Agent behavior |
| --- | --- |
| Read/search ordinary project files | No approval required inside the repository; never read `.env`/`.env.*`, secrets/private data, or paths outside the repository |
| Edit/create project files | Ask before each action; show the specific paths and intended change |
| Delete or remove project files | Never perform; explain the need and ask the user to handle it manually |
| Run terminal commands, tests, builds, scripts, or installers | Ask before each exact command; no chained or implied approval |
| Connect to or operate on a database | Never perform; the user handles all database operations |
| Inspect or use Git | Ask before each operation |
| Stage files or create commits | Ask with exact paths and commit message; review for secrets; never use broad staging |
| Push or force-push | Never perform; the user handles pushes |
| Use network or third-party services | Ask before the specific access; do not transmit project content without explicit approval |
| Read `.env` or `.env.*` files | Never perform, even with user approval |
| Change these rules or hooks | Ask for explicit approval naming the exact change |

Approval for one row or operation does not authorize another operation. Read/search access does not authorize edits, commands, Git actions, network access, or database operations.
