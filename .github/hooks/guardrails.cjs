let input = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});

function respond(permissionDecision, permissionDecisionReason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision,
        permissionDecisionReason,
      },
    }),
  );
}

process.stdin.on("end", () => {
  let event;

  try {
    event = JSON.parse(input);
  } catch {
    respond("deny", "Guardrail could not parse the tool request; failing closed.");
    return;
  }

  const toolName = String(event.tool_name ?? "");
  const toolInput =
    typeof event.tool_input === "string"
      ? event.tool_input
      : JSON.stringify(event.tool_input ?? {});

  if (
    /^(?:view|read(?:_file|file)?|list(?:_files|_directory|_dir)?|glob|rg|grep|search(?:_files|_text|_code)?|find(?:_files|_text)?)$/i.test(
      toolName,
    )
  ) {
    respond(
      "allow",
      "Read/search operations are allowed for ordinary files inside the repository. Secrets and out-of-repository paths remain prohibited.",
    );
    return;
  }

  if (/\b(?:delete|remove|unlink|rmdir|rm)\b/i.test(toolName)) {
    respond(
      "deny",
      "Agents must never delete project files or directories; ask the user to handle deletion manually.",
    );
    return;
  }

  if (/\b(?:database|sql|prisma|postgres|mysql|mongo|redis)(?:_|$)/i.test(toolName)) {
    respond(
      "deny",
      "Agents must never connect to or operate on a database.",
    );
    return;
  }

  const commandTool =
    /\b(?:bash|terminal|shell|command|runTask|exec|powershell)\b/i.test(toolName);

  if (commandTool) {
    const forbiddenCommands = [
      {
        pattern: /\b(?:git\s+push|gh\s+repo\s+sync)\b/i,
        reason: "Agents must never push; the user handles all pushes manually.",
      },
      {
        pattern:
          /\b(?:git\s+clean|git\s+reset\s+--hard|remove-item|rmdir|rd\s+\/s|del\s+\/s|erase\s+\/s|rm\s+-[^\n]*r|unlink)\b/i,
        reason: "Agents must never perform project deletion or destructive cleanup.",
      },
      {
        pattern:
          /\b(?:prisma\s+(?:migrate|db|studio)|psql|pg_dump|pg_restore|mysql(?:dump)?|mongosh|redis-cli)\b/i,
        reason: "Agents must never connect to or operate on a database.",
      },
      {
        pattern: /\b(?:drop|truncate)\s+(?:database|table|schema)\b/i,
        reason: "Agents must never connect to or operate on a database.",
      },
    ];

    for (const { pattern, reason } of forbiddenCommands) {
      if (pattern.test(toolInput)) {
        respond("deny", reason);
        return;
      }
    }
  }

  respond(
    "ask",
    "The project policy requires user approval for each tool action. Approve only after reviewing this specific request.",
  );
});
