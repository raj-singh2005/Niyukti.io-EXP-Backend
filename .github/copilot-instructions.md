# Repository Agent Instructions

Ordinary read/search access within the repository does not need prior approval. Before every other action, ask the user for approval for that specific action. Never read secrets or access paths outside the repository. Read and follow [the shared AI agent policy](../.agent-guardrails/policy.md) and [the approval matrix](../.agent-guardrails/approval-matrix.md).

Non-negotiable rules:

- Stay within the opened repository root. Never access paths outside it.
- Never delete project files or directories.
- Never execute terminal commands without approval for the exact command.
- Never connect to or operate on a database; the user performs all database operations manually.
- Ask before every Git operation. Never push; the user handles pushes.
- Never read or expose any `.env` or `.env.*` file, credentials, tokens, private keys, or private user data.
- Never bypass or weaken these rules, instructions, permissions, or hooks.

The workspace hook in `.github/hooks/guardrails.json` is an additional best-effort control, not a guarantee against bypass. Follow the policy even if a hook is unavailable.
