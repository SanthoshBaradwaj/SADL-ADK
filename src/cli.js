"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const TEMPLATE_DIR = path.join(ROOT_DIR, "templates", "project");
const SADL_VERSION = "0.1.0";

const REQUIRED_FILES = [
  "AGENTS.md",
  ".sadl.config.json",
  ".gitignore",
  ".env.example",
  "docs/01_PRD.md",
  "docs/02_ROADMAP.md",
  "docs/03_STATE.md",
  "docs/04_ARCH_SPEC.md",
  "docs/05_SESSION_LOG.md",
  "docs/setup-env.md"
];

const REQUIRED_DIRS = [
  "docs/decisions",
  "docs/session_logs",
  "src",
  "tests"
];

const PROTECTED_DEFAULTS = [
  "AGENTS.md",
  ".agent_rules.md",
  "docs/01_PRD.md",
  "docs/04_ARCH_SPEC.md"
];

const SECRET_FILE_PATTERNS = [
  /^\.env(\..*)?$/i,
  /(^|[\\/])secrets?\.(json|ya?ml|toml|ini|txt)$/i,
  /\.(pem|key|p12|pfx)$/i
];

const SECRET_TEXT_PATTERNS = [
  /\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{16,}/i,
  /\b(AKIA[0-9A-Z]{16})\b/,
  /\b(sk-[A-Za-z0-9]{20,})\b/
];

function main(argv) {
  const { command, args, options } = parseArgs(argv);

  switch (command) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return Promise.resolve();
    case "init":
    case "new":
      return Promise.resolve(commandInit(args, options, { adopt: false }));
    case "adopt":
      return Promise.resolve(commandInit(args, options, { adopt: true }));
    case "status":
      return Promise.resolve(commandStatus(args, options));
    case "validate":
    case "doctor":
      return Promise.resolve(commandValidate(args, options));
    case "checkpoint":
      return Promise.resolve(commandCheckpoint(args, options));
    case "manifest":
      return Promise.resolve(commandManifest(args, options));
    case "dream":
      return Promise.resolve(commandDream(args, options));
    case "commit":
      return Promise.resolve(commandCommit(args, options));
    case "start":
      return Promise.resolve(commandStart(args, options));
    case "intake":
      return Promise.resolve(commandIntake(args, options));
    default:
      if (!command) {
        printHelp();
        return Promise.resolve();
      }
      throw new Error(`unknown command "${command}". Run "sadl help".`);
  }
}

function parseArgs(argv) {
  const command = argv[0];
  const args = [];
  const options = {};

  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith("--")) {
      const withoutPrefix = value.slice(2);
      const [rawKey, inlineValue] = withoutPrefix.split("=", 2);
      const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      if (inlineValue !== undefined) {
        options[key] = inlineValue;
      } else if (index + 1 < argv.length && !argv[index + 1].startsWith("--")) {
        options[key] = argv[index + 1];
        index += 1;
      } else {
        options[key] = true;
      }
    } else {
      args.push(value);
    }
  }

  return { command, args, options };
}

function printHelp() {
  console.log(`SADL Kit ${SADL_VERSION}

Usage:
  sadl init [path] [--profile lite|standard|enterprise] [--force]
  sadl adopt [path] [--profile lite|standard|enterprise]
  sadl intake
  sadl start [path]
  sadl status [path]
  sadl validate [path] [--strict] [--json]
  sadl manifest [path]
  sadl checkpoint [path] --task "Task 1.1" --status WIP|DONE|BLOCKED
  sadl dream [path]
  sadl commit [path] --message "sadl: complete task"

Examples:
  sadl init my-app
  sadl validate my-app --strict
  sadl checkpoint . --task "1.1 Bootstrap app" --status DONE --next "Start task 1.2"
`);
}

function commandInit(args, options, meta) {
  const targetDir = path.resolve(args[0] || ".");
  const profile = String(options.profile || "standard").toLowerCase();
  if (!["lite", "standard", "enterprise"].includes(profile)) {
    throw new Error(`unsupported profile "${profile}". Use lite, standard, or enterprise.`);
  }

  ensureDir(targetDir);
  const result = copyTree(TEMPLATE_DIR, targetDir, {
    force: Boolean(options.force),
    replacements: {
      "__SADL_PROFILE__": profile,
      "__SADL_VERSION__": SADL_VERSION
    }
  });

  for (const dir of REQUIRED_DIRS) {
    ensureDir(path.join(targetDir, dir));
  }

  if (meta.adopt) {
    mergeGitignore(targetDir);
  }

  commandManifest([targetDir], { quiet: true });

  console.log(`${meta.adopt ? "Adopted" : "Initialized"} SADL ${profile} project at ${targetDir}`);
  console.log(`Created ${result.created} files, skipped ${result.skipped} existing files.`);
  console.log("Next: fill docs/01_PRD.md, then run: sadl validate .");
}

function commandIntake() {
  console.log(`SADL Intake Questions

Copy these answers into docs/01_PRD.md and docs/04_ARCH_SPEC.md.

1. Product intent: What are we building, for whom, and why?
2. MVP scope: What must be true for the first useful release?
3. Non-goals: What should agents explicitly avoid building?
4. Users and permissions: Which roles exist and what can each do?
5. Core workflows: What are the top user journeys?
6. Data model: What entities, relationships, retention rules, and privacy constraints matter?
7. Technical choices: Preferred stack, package manager, database, deployment target, architecture boundaries.
8. Integrations: External APIs, auth providers, payment providers, messaging, analytics, email.
9. Secrets by name only: Which env vars are required? Never paste values into docs or chat.
10. Validation: Which lint, test, typecheck, build, and security commands define done?
11. Agent policy: Allowed assistants/models, autonomy level, approval gates, budget limits.
12. Acceptance criteria: What exact observable behavior proves completion?
`);
}

function commandStart(args) {
  const projectDir = path.resolve(args[0] || ".");
  const validation = collectValidation(projectDir, { strict: false });
  const activeTask = readActiveTask(projectDir);
  const state = readStateSummary(projectDir);

  console.log("SADL Start");
  console.log(`Project: ${projectDir}`);
  console.log(`Readiness: ${validation.failures.length === 0 ? "ready" : "needs attention"}`);
  if (validation.failures.length > 0) {
    console.log("Hard failures:");
    for (const failure of validation.failures) console.log(`- ${failure}`);
  }
  console.log(`Active task: ${activeTask || "No active task found"}`);
  console.log(`Last state: ${state || "No state summary found"}`);
  console.log("");
  console.log("Agent bootstrap order:");
  console.log("1. Read AGENTS.md and .sadl.config.json.");
  console.log("2. Read docs/03_STATE.md and active item in docs/02_ROADMAP.md.");
  console.log("3. Read only relevant sections of docs/04_ARCH_SPEC.md and docs/01_PRD.md.");
  console.log("4. Execute the scoped task, validate, checkpoint, then commit if valid.");
}

function commandStatus(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const status = {
    project: projectDir,
    activeTask: readActiveTask(projectDir),
    state: readStateSummary(projectDir),
    git: getGitStatus(projectDir),
    validation: collectValidation(projectDir, { strict: false })
  };

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log(`Project: ${status.project}`);
  console.log(`Active task: ${status.activeTask || "none"}`);
  console.log(`State: ${status.state || "none"}`);
  console.log(`Git: ${status.git.available ? `${status.git.changedFiles.length} changed files` : "not a git repo"}`);
  console.log(`Validation: ${status.validation.failures.length} failures, ${status.validation.warnings.length} warnings`);
}

function commandValidate(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const result = collectValidation(projectDir, { strict: Boolean(options.strict) });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printValidation(result);
  }

  if (result.failures.length > 0) {
    process.exitCode = 1;
  }
}

function collectValidation(projectDir, options) {
  const failures = [];
  const warnings = [];
  const checks = {};

  checks.requiredFiles = true;
  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(projectDir, file))) {
      checks.requiredFiles = false;
      failures.push(`Missing required file: ${file}`);
    }
  }

  checks.requiredDirs = true;
  for (const dir of REQUIRED_DIRS) {
    if (!fs.existsSync(path.join(projectDir, dir))) {
      checks.requiredDirs = false;
      warnings.push(`Missing recommended directory: ${dir}`);
    }
  }

  const config = readConfig(projectDir, failures);
  checks.configValid = Boolean(config);

  checks.gitignoreSecrets = checkGitignore(projectDir, warnings, failures);
  checks.noTrackedSecrets = checkTrackedSecrets(projectDir, failures, warnings);
  checks.noSecretLeaks = scanSecretLeaks(projectDir, warnings);
  checks.statePresent = checkState(projectDir, options, warnings, failures);
  checks.roadmapPresent = checkRoadmap(projectDir, warnings);
  checks.manifestFresh = checkManifest(projectDir, warnings);

  const git = getGitStatus(projectDir);
  checks.protectedClean = true;
  if (git.available && config) {
    const protectedPaths = config.protectedPaths || PROTECTED_DEFAULTS;
    const changedProtected = git.changedFiles.filter((file) => protectedPaths.includes(normalizePath(file)));
    if (changedProtected.length > 0) {
      checks.protectedClean = false;
      failures.push(`Protected files changed: ${changedProtected.join(", ")}`);
    }
  }

  if (options.strict) {
    const prd = readTextIfExists(path.join(projectDir, "docs/01_PRD.md"));
    if (prd && prd.includes("[USER ACTION REQUIRED]")) {
      failures.push("PRD still contains [USER ACTION REQUIRED] placeholders.");
    }
  }

  return {
    ok: failures.length === 0,
    project: projectDir,
    checks,
    failures,
    warnings
  };
}

function printValidation(result) {
  console.log(`SADL validation for ${result.project}`);
  console.log(result.ok ? "OK" : "FAILED");

  if (result.failures.length > 0) {
    console.log("\nHard failures:");
    for (const failure of result.failures) console.log(`- ${failure}`);
  }

  if (result.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of result.warnings) console.log(`- ${warning}`);
  }
}

function commandCheckpoint(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  ensureProject(projectDir);

  const task = String(options.task || readActiveTask(projectDir) || "Unspecified task");
  const status = String(options.status || "WIP").toUpperCase();
  const allowedStatuses = ["DONE", "WIP", "BLOCKED", "FAILED_TESTS", "NEEDS_REVIEW", "WAITING_FOR_APPROVAL"];
  if (!allowedStatuses.includes(status)) {
    throw new Error(`unsupported status "${status}". Use ${allowedStatuses.join(", ")}.`);
  }

  const timestamp = new Date().toISOString();
  const blocker = String(options.blocker || "None recorded.");
  const next = String(options.next || "Review state and continue the active roadmap item.");
  const model = String(options.model || process.env.SADL_MODEL || "unspecified");
  const git = getGitStatus(projectDir);

  const state = `# 03_STATE.md: SADL Current Session State

## SESSION EXIT STATUS
- Task Status: ${status} - ${task}
- Current Blocker: ${blocker}
- Next Exact Action: ${next}
- Updated At: ${timestamp}
- Model/Assistant: ${model}

## Dirty Files
${git.available ? formatList(git.changedFiles) : "- Git repository not initialized."}

## Handoff Notes
${String(options.notes || "No additional notes.")}
`;

  writeFile(path.join(projectDir, "docs/03_STATE.md"), state);

  const logEntry = {
    schemaVersion: "1.0",
    sessionId: timestamp.replace(/[:.]/g, "-"),
    startedAt: options.startedAt || null,
    endedAt: timestamp,
    model,
    assistant: options.assistant || "unspecified",
    task,
    status,
    blocker,
    nextAction: next,
    approvalsRequested: parseNumber(options.approvals, 0),
    waitingMinutes: parseNumber(options.waitingMinutes, 0),
    commandsRun: splitCsv(options.commands),
    filesChanged: git.available ? git.changedFiles : [],
    validation: options.validation || "not recorded",
    commitHash: git.head || null,
    notes: options.notes || ""
  };

  appendSessionLog(projectDir, logEntry);
  writeJsonLog(projectDir, logEntry);
  commandManifest([projectDir], { quiet: true });

  console.log(`Checkpoint written for ${task}: ${status}`);
}

function commandManifest(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const manifest = {
    schemaVersion: "1.0",
    sadlVersion: SADL_VERSION,
    generatedAt: new Date().toISOString(),
    files: {}
  };

  const includeRoots = ["AGENTS.md", ".sadl.config.json", "docs", "src", "tests", "package.json", "pyproject.toml"];
  for (const root of includeRoots) {
    const fullPath = path.join(projectDir, root);
    if (!fs.existsSync(fullPath)) continue;
    for (const filePath of listFiles(fullPath)) {
      const rel = normalizePath(path.relative(projectDir, filePath));
      if (shouldSkipFile(rel)) continue;
      manifest.files[rel] = hashFile(filePath);
    }
  }

  writeFile(path.join(projectDir, ".sadl_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  if (!options.quiet) {
    console.log(`Manifest written with ${Object.keys(manifest.files).length} file hashes.`);
  }
}

function commandDream(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const logsDir = path.join(projectDir, "docs/session_logs");
  ensureDir(path.join(projectDir, "docs/dreams"));
  const logs = fs.existsSync(logsDir)
    ? listFiles(logsDir).filter((file) => file.endsWith(".json")).map((file) => readJson(file)).filter(Boolean)
    : [];

  const repeatedCommands = countValues(logs.flatMap((log) => log.commandsRun || []));
  const repeatedBlockers = countValues(logs.map((log) => log.blocker).filter(Boolean));
  const failedTasks = logs.filter((log) => !["DONE", "DONE_COMMITTED"].includes(log.status));
  const timestamp = new Date().toISOString();

  const report = `# SADL Dream Report

Generated: ${timestamp}

## Purpose
This report is review-only. It may suggest improvements, but agents must not auto-apply changes to AGENTS.md, .sadl.config.json, or architecture docs without human approval.

## Session Summary
- Sessions analyzed: ${logs.length}
- Non-DONE sessions: ${failedTasks.length}

## Repeated Commands
${formatCountMap(repeatedCommands)}

## Repeated Blockers
${formatCountMap(repeatedBlockers)}

## Proposed Improvements
${buildDreamSuggestions(repeatedCommands, repeatedBlockers, failedTasks)}
`;

  const outPath = path.join(projectDir, "docs/dreams", `${timestamp.replace(/[:.]/g, "-")}.md`);
  writeFile(outPath, report);
  console.log(`Dream report written: ${outPath}`);
}

function commandCommit(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const validation = collectValidation(projectDir, { strict: Boolean(options.strict) });
  if (validation.failures.length > 0) {
    printValidation(validation);
    throw new Error("refusing to commit because SADL validation has hard failures.");
  }

  const git = getGitStatus(projectDir);
  if (!git.available) {
    throw new Error("cannot commit because this is not a Git repository.");
  }

  const message = String(options.message || "sadl: checkpoint session");
  runGit(projectDir, ["add", "-A"]);
  const commit = runGit(projectDir, ["commit", "-m", message]);
  console.log(commit.stdout.trim() || "Commit complete.");
}

function readConfig(projectDir, failures) {
  const configPath = path.join(projectDir, ".sadl.config.json");
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    failures.push(`Invalid .sadl.config.json: ${error.message}`);
    return null;
  }
}

function ensureProject(projectDir) {
  for (const file of ["docs/02_ROADMAP.md", "docs/03_STATE.md", "docs/05_SESSION_LOG.md"]) {
    if (!fs.existsSync(path.join(projectDir, file))) {
      throw new Error(`not a SADL project or missing ${file}. Run sadl init first.`);
    }
  }
}

function copyTree(sourceDir, targetDir, options) {
  let created = 0;
  let skipped = 0;

  for (const item of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, item.name);
    const targetName = item.name === "gitignore.template" ? ".gitignore" : item.name;
    const targetPath = path.join(targetDir, targetName);
    if (item.isDirectory()) {
      ensureDir(targetPath);
      const nested = copyTree(sourcePath, targetPath, options);
      created += nested.created;
      skipped += nested.skipped;
    } else {
      if (fs.existsSync(targetPath) && !options.force) {
        skipped += 1;
        continue;
      }
      const content = applyReplacements(fs.readFileSync(sourcePath, "utf8"), options.replacements || {});
      writeFile(targetPath, content);
      created += 1;
    }
  }

  return { created, skipped };
}

function applyReplacements(content, replacements) {
  let output = content;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.split(key).join(value);
  }
  return output;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function appendSessionLog(projectDir, entry) {
  const filePath = path.join(projectDir, "docs/05_SESSION_LOG.md");
  const line = `\n## ${entry.endedAt} - ${entry.status} - ${entry.task}\n- Model: ${entry.model}\n- Assistant: ${entry.assistant}\n- Blocker: ${entry.blocker}\n- Next: ${entry.nextAction}\n- Files changed: ${entry.filesChanged.length}\n- Commit: ${entry.commitHash || "not recorded"}\n`;
  fs.appendFileSync(filePath, line, "utf8");
}

function writeJsonLog(projectDir, entry) {
  const filePath = path.join(projectDir, "docs/session_logs", `${entry.sessionId}.json`);
  writeFile(filePath, `${JSON.stringify(entry, null, 2)}\n`);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function readActiveTask(projectDir) {
  const roadmap = readTextIfExists(path.join(projectDir, "docs/02_ROADMAP.md"));
  const wip = roadmap.match(/^- \[(WIP|FAILED_TESTS|BLOCKED|WAITING_FOR_APPROVAL|NEEDS_REVIEW)\]\s+(.+)$/im);
  if (wip) return `${wip[1]} ${wip[2].trim()}`;
  const todo = roadmap.match(/^- \[TODO\]\s+(.+)$/im);
  return todo ? `TODO ${todo[1].trim()}` : null;
}

function readStateSummary(projectDir) {
  const state = readTextIfExists(path.join(projectDir, "docs/03_STATE.md"));
  const status = state.match(/Task Status:\s*(.+)/i);
  return status ? status[1].trim() : null;
}

function checkGitignore(projectDir, warnings, failures) {
  const gitignorePath = path.join(projectDir, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    failures.push("Missing .gitignore with secret exclusions.");
    return false;
  }
  const content = fs.readFileSync(gitignorePath, "utf8");
  const required = [".env", ".env.*", "*.pem", "*.key"];
  const missing = required.filter((pattern) => !content.includes(pattern));
  if (missing.length > 0) {
    warnings.push(`.gitignore is missing recommended secret patterns: ${missing.join(", ")}`);
    return false;
  }
  return true;
}

function checkTrackedSecrets(projectDir, failures, warnings) {
  const git = runGitMaybe(projectDir, ["ls-files"]);
  if (!git.ok) {
    warnings.push("Git is not initialized; tracked secret check skipped.");
    return true;
  }
  const tracked = git.stdout.split(/\r?\n/).filter(Boolean);
  const secretFiles = tracked.filter((file) => {
    const normalized = normalizePath(file);
    if (normalized === ".env.example" || normalized.endsWith("/.env.example")) return false;
    return SECRET_FILE_PATTERNS.some((pattern) => pattern.test(path.basename(file)) || pattern.test(file));
  });
  if (secretFiles.length > 0) {
    failures.push(`Tracked secret-like files found: ${secretFiles.join(", ")}`);
    return false;
  }
  return true;
}

function scanSecretLeaks(projectDir, warnings) {
  const filesToScan = [
    "docs/03_STATE.md",
    "docs/05_SESSION_LOG.md",
    "AGENTS.md",
    ".agent_rules.md"
  ];
  let ok = true;
  for (const rel of filesToScan) {
    const filePath = path.join(projectDir, rel);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    for (const pattern of SECRET_TEXT_PATTERNS) {
      if (pattern.test(content)) {
        warnings.push(`Potential secret value detected in ${rel}. Review and redact.`);
        ok = false;
      }
    }
  }
  return ok;
}

function checkState(projectDir, options, warnings, failures) {
  const state = readTextIfExists(path.join(projectDir, "docs/03_STATE.md"));
  if (!state.includes("SESSION EXIT STATUS")) {
    warnings.push("docs/03_STATE.md does not contain a SESSION EXIT STATUS block yet.");
    return false;
  }
  if (options.strict && state.includes("No active session has completed yet.")) {
    failures.push("No completed SADL checkpoint has been recorded.");
    return false;
  }
  return true;
}

function checkRoadmap(projectDir, warnings) {
  const roadmap = readTextIfExists(path.join(projectDir, "docs/02_ROADMAP.md"));
  if (!/\[(TODO|WIP|DONE|BLOCKED|FAILED_TESTS|NEEDS_REVIEW|WAITING_FOR_APPROVAL|SPLIT_REQUIRED|ABANDONED)\]/.test(roadmap)) {
    warnings.push("Roadmap has no recognized task states.");
    return false;
  }
  return true;
}

function checkManifest(projectDir, warnings) {
  const manifestPath = path.join(projectDir, ".sadl_manifest.json");
  if (!fs.existsSync(manifestPath)) {
    warnings.push(".sadl_manifest.json missing; run sadl manifest.");
    return false;
  }
  const manifest = readJson(manifestPath);
  if (!manifest || !manifest.files) {
    warnings.push(".sadl_manifest.json is invalid; run sadl manifest.");
    return false;
  }
  return true;
}

function mergeGitignore(projectDir) {
  const gitignorePath = path.join(projectDir, ".gitignore");
  const existing = readTextIfExists(gitignorePath);
  const additions = [".env", ".env.*", "!.env.example", "*.pem", "*.key", "*.p12", "*.pfx"];
  const missing = additions.filter((line) => !existing.includes(line));
  if (missing.length > 0) {
    fs.appendFileSync(gitignorePath, `\n# SADL secret safety\n${missing.join("\n")}\n`, "utf8");
  }
}

function getGitStatus(projectDir) {
  const status = runGitMaybe(projectDir, ["status", "--porcelain"]);
  const head = runGitMaybe(projectDir, ["rev-parse", "--short", "HEAD"]);
  if (!status.ok) {
    return { available: false, changedFiles: [], head: null };
  }
  const changedFiles = status.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .map((file) => normalizePath(file.replace(/^"|"$/g, "")));
  return {
    available: true,
    changedFiles,
    head: head.ok ? head.stdout.trim() : null
  };
}

function runGitMaybe(projectDir, args) {
  const result = spawnSync("git", args, {
    cwd: projectDir,
    encoding: "utf8"
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function runGit(projectDir, args) {
  const result = spawnSync("git", args, {
    cwd: projectDir,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  }
  return result;
}

function listFiles(startPath) {
  if (!fs.existsSync(startPath)) return [];
  const stat = fs.statSync(startPath);
  if (stat.isFile()) return [startPath];

  const files = [];
  for (const item of fs.readdirSync(startPath, { withFileTypes: true })) {
    const fullPath = path.join(startPath, item.name);
    const rel = normalizePath(path.relative(process.cwd(), fullPath));
    if (item.isDirectory()) {
      if ([".git", "node_modules", ".sadl-cache", "dist", "build", "coverage"].includes(item.name)) continue;
      files.push(...listFiles(fullPath));
    } else if (!shouldSkipFile(rel)) {
      files.push(fullPath);
    }
  }
  return files;
}

function shouldSkipFile(relPath) {
  const normalized = normalizePath(relPath);
  return normalized.includes("/.git/") ||
    normalized.includes("/node_modules/") ||
    normalized.endsWith(".png") ||
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg") ||
    normalized.endsWith(".gif") ||
    normalized.endsWith(".pdf") ||
    normalized.endsWith(".zip");
}

function hashFile(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function formatList(values) {
  if (!values || values.length === 0) return "- None.";
  return values.map((value) => `- ${value}`).join("\n");
}

function splitCsv(value) {
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function parseNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function countValues(values) {
  const counts = new Map();
  for (const value of values) {
    const key = String(value || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function formatCountMap(entries) {
  const repeated = entries.filter(([, count]) => count > 1).slice(0, 10);
  if (repeated.length === 0) return "- No repeated items detected.";
  return repeated.map(([value, count]) => `- ${value}: ${count}`).join("\n");
}

function buildDreamSuggestions(commandCounts, blockerCounts, failedTasks) {
  const suggestions = [];
  if (commandCounts.some(([, count]) => count > 2)) {
    suggestions.push("- Add or tighten a tool budget for repeated commands.");
  }
  if (blockerCounts.some(([, count]) => count > 1)) {
    suggestions.push("- Add an architecture note or BKM for the repeated blocker.");
  }
  if (failedTasks.length > 0) {
    suggestions.push("- Review failed tasks and decide whether to split, block, or re-scope them.");
  }
  suggestions.push("- Human review required before changing AGENTS.md, .sadl.config.json, or docs/04_ARCH_SPEC.md.");
  return suggestions.join("\n");
}

module.exports = {
  main,
  collectValidation
};
