# AI Agent Guardrails

Ordinary read/search access within the repository does not need prior approval. Before every other action, ask the user for approval for that specific action. Never read secrets or access paths outside the repository. Read and follow `.agent-guardrails/policy.md` and `.agent-guardrails/approval-matrix.md`.

- Work only inside the opened repository root.
- Never delete project files or directories.
- Never run terminal commands without approval for the exact command.
- Never connect to, query, or otherwise operate on a database. The user performs all database operations manually.
- Ask before every Git operation. Never push; the user handles pushes.
- Never read or reveal `.env`, credentials, tokens, private keys, or private user data.
- Never bypass or weaken these rules or their hooks.

These project rules guide behavior. They are not a substitute for Claude Code permissions, sandboxing, or independently configured hooks; do not claim they make prohibited actions impossible.
