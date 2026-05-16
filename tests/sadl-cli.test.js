"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "bin", "sadl.js");
const createCli = path.join(repoRoot, "bin", "create-sadl-project.js");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sadl-test-"));

function run(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    ...options
  });
}

function assertOk(result, label) {
  assert.strictEqual(
    result.status,
    0,
    `${label} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
  );
}

try {
  const project = path.join(tempRoot, "my-app");
  const createdProject = path.join(tempRoot, "created-app");
  const interactiveProject = path.join(tempRoot, "interactive-app");
  const legacyProject = path.join(tempRoot, "legacy-app");

  let result = run(["init", project]);
  assertOk(result, "init");
  assert(fs.existsSync(path.join(project, "AGENTS.md")), "AGENTS.md should exist");
  assert(fs.existsSync(path.join(project, "docs", "01_PRD.md")), "PRD should exist");
  assert(fs.existsSync(path.join(project, ".sadl", "config.json")), ".sadl/config.json should exist");
  assert(fs.existsSync(path.join(project, ".sadl", "traceability.json")), ".sadl/traceability.json should exist");
  assert(fs.existsSync(path.join(project, ".sadl", "runtime.json")), ".sadl/runtime.json should exist");
  assert(fs.existsSync(path.join(project, ".sadl_manifest.json")), "manifest should exist");
  assert.match(
    fs.readFileSync(path.join(project, "docs", "03_STATE.md"), "utf8"),
    /^---\r?\nschemaVersion:/,
    "initial state should include machine-readable frontmatter"
  );

  result = spawnSync(process.execPath, [createCli, createdProject], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assertOk(result, "create-sadl-project");
  assert(fs.existsSync(path.join(createdProject, "AGENTS.md")), "create wrapper should init project");

  result = run(["init", interactiveProject]);
  assertOk(result, "interactive init");
  const answers = [
    "Build a tiny notes prototype for solo builders.",
    "Solo builder, AI coding assistant",
    "Create notes, List notes",
    "Payments, Mobile app",
    "Create a note, View notes",
    "User can create a note, User can list notes",
    "Note has id, title, body, and created timestamp.",
    "JavaScript",
    "None",
    "npm",
    "JSON file",
    "local",
    "None",
    "AUTH_SECRET",
    "",
    "node -e \"process.exit(0)\"",
    "",
    "",
    "medium",
    "production_deploy"
  ].join("\n");
  result = run(["intake", interactiveProject, "--write"], { input: answers });
  assertOk(result, "interactive intake");
  assert.match(
    fs.readFileSync(path.join(interactiveProject, "docs", "01_PRD.md"), "utf8"),
    /tiny notes prototype/,
    "interactive intake should write PRD"
  );

  fs.mkdirSync(path.join(legacyProject, "docs", "decisions"), { recursive: true });
  fs.mkdirSync(path.join(legacyProject, "docs", "session_logs"), { recursive: true });
  fs.mkdirSync(path.join(legacyProject, "src"), { recursive: true });
  fs.mkdirSync(path.join(legacyProject, "tests"), { recursive: true });
  fs.writeFileSync(path.join(legacyProject, "AGENTS.md"), "# AGENTS\n", "utf8");
  fs.writeFileSync(path.join(legacyProject, ".gitignore"), ".env\n.env.*\n!.env.example\n*.pem\n*.key\n", "utf8");
  fs.writeFileSync(path.join(legacyProject, ".env.example"), "", "utf8");
  fs.writeFileSync(path.join(legacyProject, "docs", "01_PRD.md"), "# PRD\n", "utf8");
  fs.writeFileSync(path.join(legacyProject, "docs", "02_ROADMAP.md"), "- [TODO] Legacy task\n", "utf8");
  fs.writeFileSync(path.join(legacyProject, "docs", "03_STATE.md"), "## SESSION EXIT STATUS\n- Task Status: WIP - Legacy\n", "utf8");
  fs.writeFileSync(path.join(legacyProject, "docs", "04_ARCH_SPEC.md"), "# Arch\n", "utf8");
  fs.writeFileSync(path.join(legacyProject, "docs", "05_SESSION_LOG.md"), "# Log\n", "utf8");
  fs.writeFileSync(path.join(legacyProject, "docs", "setup-env.md"), "# Env\n", "utf8");
  fs.writeFileSync(path.join(legacyProject, ".sadl.config.json"), JSON.stringify({
    schemaVersion: "1.0",
    sadlVersion: "0.1.1",
    profile: "standard",
    protectedPaths: ["AGENTS.md"],
    writablePaths: ["src", "tests"],
    roadmapStates: ["TODO", "WIP", "DONE", "BLOCKED"],
    validation: { lint: [], test: [], typecheck: [], build: [] },
    toolBudgets: {
      maxSearchCommandsPerAudit: 10,
      maxRepeatedCommand: 2,
      maxFailedTestRetries: 3,
      maxNoProgressMinutes: 10,
      approvalWaitMode: "pause"
    },
    tokenPolicy: {
      hostManaged: true,
      handoffThresholdPercent: 85,
      reserveFinalPercent: 10
    },
    modelPolicy: {},
    approvalPolicy: {},
    commitPolicy: {},
    secretPolicy: {}
  }, null, 2), "utf8");
  result = run(["migrate", legacyProject]);
  assertOk(result, "legacy migrate");
  assert(fs.existsSync(path.join(legacyProject, ".sadl", "config.json")), "migrate should create .sadl/config.json");
  assert(fs.existsSync(path.join(legacyProject, ".sadl", "traceability.json")), "migrate should create traceability");
  assert(fs.existsSync(path.join(legacyProject, ".sadl", "approvals.json")), "migrate should create local approvals");
  assert(fs.existsSync(path.join(legacyProject, ".sadl.config.json.bak")), "migrate should back up legacy config");
  assert.match(fs.readFileSync(path.join(legacyProject, ".gitignore"), "utf8"), /\.sadl\/runtime\.json/, "migrate should protect runtime state");
  result = run(["doctor", legacyProject]);
  assertOk(result, "legacy doctor after migrate");

  const intakePath = path.join(tempRoot, "intake.json");
  fs.writeFileSync(intakePath, JSON.stringify({
    productIntent: "Build a small prototype task tracker for solo builders who want AI-assisted handoffs.",
    targetUsers: ["Solo builder", "AI coding assistant"],
    mvpScope: ["Create tasks", "Mark tasks done", "Show active task"],
    nonGoals: ["Payments", "Native mobile app"],
    coreWorkflows: ["Create a task", "Complete a task"],
    acceptanceCriteria: ["User can create a task", "User can mark a task done"],
    dataModel: "Task has id, title, status, and created timestamp.",
    technicalPreferences: {
      language: "JavaScript",
      framework: "None",
      packageManager: "npm",
      database: "JSON file",
      deployment: "local"
    },
    integrations: ["None"],
    secretNames: ["AUTH_SECRET"],
    validationCommands: {
      lint: [],
      test: ["node -e \"process.exit(0)\""],
      typecheck: [],
      build: []
    },
    agentPolicy: {
      autonomy: "medium",
      approvals: ["production_deploy"]
    }
  }, null, 2), "utf8");

  result = run(["intake", project, "--from-json", intakePath]);
  assertOk(result, "intake from json");
  const prd = fs.readFileSync(path.join(project, "docs", "01_PRD.md"), "utf8");
  assert.match(prd, /task tracker/, "intake should write PRD content");

  result = run(["prd-check", project]);
  assertOk(result, "prd check");

  result = run(["prd-check", project, "--fix-propose"]);
  assertOk(result, "prd check proposal");
  let traceability = JSON.parse(fs.readFileSync(path.join(project, ".sadl", "traceability.json"), "utf8"));
  assert(traceability.sources.prd.hash, "prd-check should sync-lock PRD hash");
  assert(Object.keys(traceability.requirements).length > 0, "prd-check should propose requirement IDs");

  fs.appendFileSync(path.join(project, "docs", "01_PRD.md"), "\n\n## Change Note\nThis change should desync traceability until reviewed.\n", "utf8");
  result = run(["validate", project]);
  assert.notStrictEqual(result.status, 0, "validate should fail on PRD/traceability desync");
  assert.match(result.stdout, /PRD\/traceability desync/, "validate should report PRD desync");

  result = run(["prd-check", project, "--fix-propose"]);
  assertOk(result, "prd check resync");
  traceability = JSON.parse(fs.readFileSync(path.join(project, ".sadl", "traceability.json"), "utf8"));
  assert.strictEqual(traceability.sources.prd.hash.length, 64, "resync should store a SHA-256 PRD hash");

  result = run(["plan", project, "--write"]);
  assertOk(result, "plan write");
  const roadmap = fs.readFileSync(path.join(project, "docs", "02_ROADMAP.md"), "utf8");
  assert.match(roadmap, /NEEDS_REVIEW/, "plan should add approval gate");
  assert.match(roadmap, /TASK-001/, "plan should write task IDs");
  assert.match(roadmap, /FR-001/, "plan should link tasks to requirement IDs");

  result = run(["trace", project, "--json"]);
  assertOk(result, "trace json");
  const traceReport = JSON.parse(result.stdout);
  assert(traceReport.tasks.total > 0, "trace should report tasks");
  assert.strictEqual(traceReport.coveragePercent, 100, "traceable generated plan should have full coverage");

  result = run(["run", project, "--category", "test"]);
  assert.notStrictEqual(result.status, 0, "validation runner should require approval by default");
  assert.match(`${result.stdout}\n${result.stderr}`, /Command approval required/, "run should explain approval gate");

  result = run(["run", project, "--category", "test", "--yes"]);
  assertOk(result, "validation runner");

  result = run(["ci", project]);
  assertOk(result, "ci template");
  assert(fs.existsSync(path.join(project, ".github", "workflows", "sadl-validate.yml")), "CI workflow should exist");
  assert.doesNotMatch(
    fs.readFileSync(path.join(project, ".github", "workflows", "sadl-validate.yml"), "utf8"),
    /@latest/,
    "CI workflow should pin SADL package version"
  );

  result = run(["adapter", project, "--tool", "claude-code"]);
  assertOk(result, "adapter generation");
  assert(fs.existsSync(path.join(project, "CLAUDE.md")), "CLAUDE.md should exist");

  result = run(["adapter", project, "--tool", "codex"]);
  assertOk(result, "codex adapter generation");
  assert(fs.existsSync(path.join(project, "docs", "adapters", "codex.md")), "codex adapter notes should exist");

  result = run(["policy", project, "--apply", "startup-saas"]);
  assertOk(result, "policy apply");
  const config = JSON.parse(fs.readFileSync(path.join(project, ".sadl", "config.json"), "utf8"));
  assert.strictEqual(config.policyPack, "startup-saas", "policy pack should be recorded");

  result = run(["validate", project]);
  assertOk(result, "validate");
  assert.match(result.stdout, /SADL validation/, "validate should print validation summary");

  result = run(["validate", project, "--strict"]);
  assert.notStrictEqual(result.status, 0, "strict validation should fail while placeholders remain");
  assert.match(result.stdout, /No completed SADL checkpoint/, "strict validation should require a checkpoint");

  result = run([
    "checkpoint",
    project,
    "--task",
    "0.1 Complete PRD",
    "--task-id",
    "TASK-001",
    "--status",
    "DONE",
    "--model",
    "test-model",
    "--commands",
    "sadl validate",
    "--validation",
    "template validation passed",
    "--input-tokens",
    "1200",
    "--output-tokens",
    "300",
    "--cost-usd",
    "0.02",
    "--usage-source",
    "agent_reported",
    "--next",
    "Fill architecture spec"
  ]);
  assertOk(result, "checkpoint");
  const state = fs.readFileSync(path.join(project, "docs", "03_STATE.md"), "utf8");
  assert.match(state, /^---\r?\nschemaVersion:/, "checkpoint should preserve state frontmatter");
  assert.match(state, /taskId: "TASK-001"/, "checkpoint frontmatter should include task ID");
  assert.match(state, /requirementIds: \["FR-001"\]/, "checkpoint frontmatter should include requirement IDs");
  assert.match(state, /Task Status: DONE - 0.1 Complete PRD/, "checkpoint should update state");
  const runtime = JSON.parse(fs.readFileSync(path.join(project, ".sadl", "runtime.json"), "utf8"));
  assert.strictEqual(runtime.activeSession.taskId, "TASK-001", "checkpoint should sync runtime task ID");
  assert.strictEqual(runtime.activeSession.status, "DONE", "checkpoint should sync runtime status");
  assert.deepStrictEqual(runtime.activeSession.requirementIds, ["FR-001"], "checkpoint should sync runtime requirements");
  traceability = JSON.parse(fs.readFileSync(path.join(project, ".sadl", "traceability.json"), "utf8"));
  assert.strictEqual(traceability.tasks["TASK-001"].status, "AGENT_VERIFIED", "checkpoint should update task traceability status");
  assert(traceability.evidence.some((entry) => entry.taskId === "TASK-001"), "checkpoint should write task evidence");

  const logs = fs.readdirSync(path.join(project, "docs", "session_logs")).filter((file) => file.endsWith(".json"));
  assert.strictEqual(logs.length, 1, "checkpoint should write one JSON log");
  const sessionLog = JSON.parse(fs.readFileSync(path.join(project, "docs", "session_logs", logs[0]), "utf8"));
  assert.strictEqual(sessionLog.usage.totalTokens, 1500, "checkpoint should record total usage in session log");
  const telemetry = JSON.parse(fs.readFileSync(path.join(project, ".sadl", "telemetry.json"), "utf8"));
  assert.strictEqual(telemetry.sessions.length, 1, "checkpoint should write local telemetry when usage exists");
  assert.strictEqual(telemetry.sessions[0].estimatedCostUsd, 0.02, "telemetry should record cost");

  result = run(["metrics", project, "--json"]);
  assertOk(result, "metrics json");
  const metrics = JSON.parse(result.stdout);
  assert.strictEqual(metrics.usage.totalTokens, 1500, "metrics should total token usage");
  assert.strictEqual(metrics.sessions.withUsage, 1, "metrics should count usage-aware sessions");
  assert.strictEqual(metrics.tasks.completed, 1, "metrics should count completed tasks");
  assert.strictEqual(metrics.requirements.agentVerified, 1, "metrics should count agent-verified requirement links");
  assert.strictEqual(metrics.efficiency.tokensPerCompletedTask, 1500, "metrics should compute tokens per completed task");

  const breakerConfigPath = path.join(project, ".sadl", "config.json");
  const breakerConfig = JSON.parse(fs.readFileSync(breakerConfigPath, "utf8"));
  breakerConfig.validation.test = ["node -e \"process.exit(1)\""];
  breakerConfig.circuitBreakerPolicy = {
    enabled: true,
    maxConsecutiveFailures: 1,
    maxCommandTimeouts: 1,
    blockOnRepeatedError: true,
    updateStateOnTrip: true
  };
  fs.writeFileSync(breakerConfigPath, `${JSON.stringify(breakerConfig, null, 2)}\n`, "utf8");

  result = run(["run", project, "--category", "test", "--yes"]);
  assert.notStrictEqual(result.status, 0, "failing validation should trip configured circuit breaker");
  assert.match(`${result.stdout}\n${result.stderr}`, /Circuit breaker tripped/, "run should report circuit breaker trip");
  const breakerRuntime = JSON.parse(fs.readFileSync(path.join(project, ".sadl", "runtime.json"), "utf8"));
  assert.strictEqual(breakerRuntime.taskMetrics["TASK-001"].consecutiveFailures, 1, "breaker should count task failures");
  assert.match(breakerRuntime.taskMetrics["TASK-001"].blockedReason, /consecutive validation failures/, "breaker should store blocker reason");
  const breakerState = fs.readFileSync(path.join(project, "docs", "03_STATE.md"), "utf8");
  assert.match(breakerState, /status: "BLOCKED"/, "breaker should update handoff status");
  assert.match(breakerState, /Circuit breaker tripped/, "breaker state should include recovery blocker");
  traceability = JSON.parse(fs.readFileSync(path.join(project, ".sadl", "traceability.json"), "utf8"));
  assert.strictEqual(traceability.tasks["TASK-001"].status, "BLOCKED", "breaker should block traceability task");
  assert.match(
    fs.readFileSync(path.join(project, "docs", "02_ROADMAP.md"), "utf8"),
    /\[BLOCKED\].*TASK-001/,
    "breaker should mark roadmap task blocked"
  );

  result = run(["dream", project]);
  assertOk(result, "dream");
  assert(fs.existsSync(path.join(project, "docs", "dreams")), "dreams directory should exist");

  result = run(["dashboard", project]);
  assertOk(result, "dashboard");
  assert(fs.existsSync(path.join(project, "docs", "sadl-dashboard.html")), "dashboard should exist");

  result = run(["status", project, "--json"]);
  assertOk(result, "status json");
  const status = JSON.parse(result.stdout);
  assert.strictEqual(status.project, project, "status should include project path");

  console.log("sadl-cli tests passed");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
