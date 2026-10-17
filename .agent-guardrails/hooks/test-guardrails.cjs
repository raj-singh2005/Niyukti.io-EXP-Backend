const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const hookPath = path.join(__dirname, "..", "..", ".github", "hooks", "guardrails.cjs");

function runHook(event) {
  const input = typeof event === "string" ? event : JSON.stringify(event);
  const result = spawnSync(process.execPath, [hookPath], {
    encoding: "utf8",
    input,
  });

  assert.equal(result.status, 0, result.stderr || "Hook process failed");
  return JSON.parse(result.stdout);
}

function decisionFor(event) {
  return runHook(event).hookSpecificOutput.permissionDecision;
}

const cases = [
  {
    name: "allows ordinary read-only tools",
    event: { tool_name: "view", tool_input: { path: "src/app.ts" } },
    expected: "allow",
  },
  {
    name: "asks approval for a normal command",
    event: { tool_name: "terminal", tool_input: { command: "npm test" } },
    expected: "ask",
  },
  {
    name: "denies push commands",
    event: { tool_name: "terminal", tool_input: { command: "git push origin main" } },
    expected: "deny",
  },
  {
    name: "denies push commands from Claude-style Bash events",
    event: { tool_name: "Bash", tool_input: { command: "git push origin main" } },
    expected: "deny",
  },
  {
    name: "denies database commands",
    event: { tool_name: "terminal", tool_input: { command: "npx prisma migrate dev" } },
    expected: "deny",
  },
  {
    name: "denies destructive commands",
    event: { tool_name: "terminal", tool_input: { command: "Remove-Item src\\old.ts" } },
    expected: "deny",
  },
  {
    name: "fails closed on malformed input",
    event: "{",
    expected: "deny",
  },
];

for (const testCase of cases) {
  assert.equal(decisionFor(testCase.event), testCase.expected, testCase.name);
  process.stdout.write(`PASS ${testCase.name}\n`);
}

process.stdout.write(`Passed ${cases.length} guardrail hook checks.\n`);
