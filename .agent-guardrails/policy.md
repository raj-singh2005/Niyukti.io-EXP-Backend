# AI Agent Guardrails

This policy applies to every AI agent working in this repository, including Copilot, Claude Code, Cursor, and Antigravity. Platform-specific rules should point agents here. If a platform cannot enforce a rule, the agent must still follow it as an instruction and explain the limitation.

## Approval required for actions

- Reading or searching ordinary project files inside the repository does not require prior approval.
- Never read secrets or private data, and never access paths outside the repository.
- Before every other action, state exactly what will be done and ask the user for approval.
- This includes file edits/creation, terminal commands, tests/builds, Git operations, network access, and use of external services or tools.
- Approval is limited to the specific action described. It does not authorize follow-up actions, batches, chained commands, or a different operation.
- If approval is denied, unclear, or unavailable, stop. Do not use another tool or method to achieve the same action.

## Project boundary

- Work only within the repository root explicitly opened by the user.
- Never read, create, modify, or execute files outside that root, including paths reached through symlinks.
- If the repository root cannot be established with confidence, stop and ask.

## File deletion and destructive changes

- Never delete any file or directory in the project, including empty, generated, temporary, or apparently unused files.
- Never run cleanup, reset, clean, overwrite, truncation, or other destructive operations against project data.
- Do not remove existing code or documentation as part of an edit. If removal appears necessary, explain the reason and ask the user to perform it manually.
- Do not edit, disable, or weaken this policy, its platform entry points, or its hooks without the user's explicit approval for the exact change.

## Terminal and command execution

- Never run a terminal command, script, test, build, formatter, installer, or task without approval for that exact command.
- Show the complete command before asking. Do not chain commands unless every command in the chain is separately approved.
- Do not evade a denied command by using another shell, runtime, tool, or indirect execution path.

## Database operations

- Agents must never connect to, query, inspect, modify, migrate, seed, reset, or otherwise operate on any database.
- This includes application-backed health checks, Prisma commands, SQL clients, database MCP tools, and scripts that access a database.
- The user performs all database operations manually. Agents may discuss or prepare code changes only when separately requested; they must not execute them.

## Git operations

- Ask before every Git operation, including status/diff/history inspection, staging, commits, branch operations, fetch, pull, and remote operations.
- Never push. The user performs all pushes manually.
- Never force-push, rewrite history, or overwrite remote state.
- Before staging or committing, show the exact paths and proposed commit message, and ask for approval.
- Never use broad staging such as `git add .`; review staged paths and content for secrets first.

## Secrets, privacy, and external services

- Never open, print, or transmit `.env`, credentials, access tokens, refresh tokens, private keys, database dumps, or private user data. This prohibition applies even to otherwise-allowed read operations.
- Never place secrets or real user data in source, tests, documentation, logs, commits, or tool output.
- Do not send project content to third-party services or access the network without the user's specific approval.

## Reporting

- Do not claim an action or verification succeeded unless it was actually performed and checked.
- Clearly report denied actions, failures, unrun checks, assumptions, and remaining risks.

## Enforcement limits

This policy is the shared source of truth, not a universal security boundary. Platform instructions guide model behavior. Hooks can only mediate operations that their host exposes to those hooks, and local hooks may be disabled or bypassed. Use platform permissions and operating-system/workspace isolation to restrict filesystem, database, terminal, and network access. Never represent repository files alone as impossible to bypass.
