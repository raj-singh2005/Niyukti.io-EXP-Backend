# Agent Guardrails

`policy.md` is the shared policy for AI agents in this repository. `approval-matrix.md` summarizes which actions require approval and which actions agents must never perform.

Platform-recognized instruction files are kept in their expected locations so supported agents discover the rules automatically:

- GitHub Copilot / VS Code: `.github/copilot-instructions.md`
- VS Code Local hooks: `.github/hooks/guardrails.json` and `.github/hooks/guardrails.cjs`
- Claude Code: `.claude/rules/guardrails.md`
- Cursor: `.cursor/rules/guardrails.mdc`
- Antigravity: `.agent/rules/guardrails.md`

## Hook limitations

The VS Code hook allows recognizable read-only tools without prompting, asks for approval before other tool actions, and denies clearly identifiable deletion, database, and push operations. Secret files and paths outside the repository remain prohibited by policy. This is a best-effort guard: tool payloads vary by harness, and no text rule or repository hook can guarantee enforcement across all agents or prevent a user from disabling the hook.

For VS Code, the workspace must be trusted and the Local agent hook setting (`chat.useHooks`) must be enabled. The hook is configured for the VS Code Local harness; other Copilot harnesses may use different hook formats.

Claude Code, Cursor, and Antigravity have separate configuration and hook capabilities that can vary by installed version. Their rule files provide automatic project guidance, but they are not represented here as deterministic blocking hooks. Review the installed platform's official documentation and permissions before relying on enforcement.

For stronger prevention, restrict the agent's filesystem/workspace, terminal, network, and database credentials at the platform or operating-system level. Do not give agents database credentials if they must never access a database.

Hooks are executable code. Review them before enabling or modifying them. No hook in this folder has been run as part of its creation.
