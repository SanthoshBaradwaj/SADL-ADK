"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");
const { validateSchema } = require("./schema-validator");

const ROOT_DIR = path.resolve(__dirname, "..");
const TEMPLATE_DIR = path.join(ROOT_DIR, "templates", "project");
const SCHEMA_DIR = path.join(ROOT_DIR, "schemas");
const POLICY_DIR = path.join(ROOT_DIR, "policy-packs");
const SADL_VERSION = require("../package.json").version;

const REQUIRED_FILES = [
  "AGENTS.md",
  ".sadl/config.json",
  ".sadl/traceability.json",
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
  ".sadl",
  "docs/decisions",
  "docs/session_logs",
  "src",
  "tests"
];

const LOCAL_SADL_FILES = [
  ".sadl/runtime.json",
  ".sadl/approvals.json",
  ".sadl/telemetry.json"
];

const LOCAL_SADL_DIRS = [
  ".sadl/cache",
  ".sadl/locks"
];

const PROTECTED_DEFAULTS = [
  "AGENTS.md",
  ".agent_rules.md",
  ".sadl/config.json",
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

const PRD_CONCEPTS = [
  {
    key: "overview",
    label: "Overview / Product Intent",
    patterns: [/overview/i, /product intent/i, /who.*what.*why/i]
  },
  {
    key: "goals",
    label: "Goals And Non-Goals",
    patterns: [/goals/i, /non-?goals/i, /mvp scope/i]
  },
  {
    key: "userStories",
    label: "User Stories / Workflows",
    patterns: [/user stories/i, /target users/i, /roles/i, /core workflows/i, /persona/i]
  },
  {
    key: "functionalRequirements",
    label: "Functional Requirements / Acceptance Criteria",
    patterns: [/functional requirements/i, /acceptance criteria/i, /observable outcomes/i]
  },
  {
    key: "techStack",
    label: "Tech Stack / Architecture Guardrails",
    patterns: [/tech stack/i, /technical choices/i, /architecture/i, /operational requirements/i]
  },
  {
    key: "apiData",
    label: "API / Data",
    patterns: [/api/i, /data/i, /database/i, /schema/i, /privacy/i]
  },
  {
    key: "uiUx",
    label: "UI / UX Notes",
    patterns: [/ui/i, /ux/i, /layout/i, /accessibility/i, /canvas/i]
  },
  {
    key: "ciCd",
    label: "CI/CD Gates",
    patterns: [/ci\/cd/i, /validation/i, /test expectations/i, /lint/i, /coverage/i]
  },
  {
    key: "scopeFirewall",
    label: "Out Of Scope / Scope Firewall",
    patterns: [/out of scope/i, /non-?goals/i, /must avoid/i]
  }
];

const VAGUE_REQUIREMENT_WORDS = [
  "fast",
  "scalable",
  "secure",
  "simple",
  "robust",
  "user-friendly",
  "reliable",
  "performant"
];

const MEASUREMENT_HINT_PATTERN = /(\d|<|>|<=|>=|%|ms\b|sec(ond)?s?\b|min(ute)?s?\b|p95|p99|sla|rps|requests?|users?|coverage|wcag|kb\b|mb\b|gb\b)/i;

function main(argv) {
  const { command, args, options } = parseArgs(argv);

  switch (command) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return Promise.resolve();
    case "version":
    case "--version":
    case "-v":
      console.log(SADL_VERSION);
      return Promise.resolve();
    case "init":
    case "new":
      return Promise.resolve(commandInit(args, options, { adopt: false }));
    case "adopt":
      return Promise.resolve(commandInit(args, options, { adopt: true }));
    case "migrate":
      return Promise.resolve(commandMigrate(args, options));
    case "prd-check":
    case "prdcheck":
      return Promise.resolve(commandPrdCheck(args, options));
    case "status":
      return Promise.resolve(commandStatus(args, options));
    case "validate":
    case "doctor":
      return Promise.resolve(commandValidate(args, options));
    case "run":
      return Promise.resolve(commandRun(args, options));
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
      return commandIntake(args, options);
    case "plan":
      return Promise.resolve(commandPlan(args, options));
    case "branch":
      return Promise.resolve(commandBranch(args, options));
    case "worktree":
      return Promise.resolve(commandWorktree(args, options));
    case "ci":
      return Promise.resolve(commandCi(args, options));
    case "dashboard":
      return Promise.resolve(commandDashboard(args, options));
    case "policy":
      return Promise.resolve(commandPolicy(args, options));
    case "adapter":
      return Promise.resolve(commandAdapter(args, options));
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
  sadl migrate [path]
  sadl prd-check [path] [--json] [--fix-propose]
  sadl intake [path] [--write] [--from-json intake.json]
  sadl plan [path] [--write]
  sadl start [path]
  sadl status [path]
  sadl validate [path] [--strict] [--json] [--run] [--yes|--trust-command] [--unsafe-shell]
  sadl run [path] [--category lint|test|typecheck|build] [--yes|--trust-command] [--unsafe-shell]
  sadl manifest [path]
  sadl checkpoint [path] --task "Task 1.1" --status WIP|DONE|BLOCKED
  sadl dream [path]
  sadl dashboard [path]
  sadl branch [path] --task "Task 1.1"
  sadl worktree [path] --task "Task 1.1" --dir "../task-1-1"
  sadl ci [path]
  sadl policy [path] --list | --apply solo|startup-saas|enterprise|open-source|monorepo
  sadl adapter [path] --tool codex|claude-code|cursor|gemini|github-copilot|generic-cli
  sadl commit [path] --paths src/file.ts,tests/file.test.ts --message "sadl: complete task"

Examples:
  sadl init my-app
  sadl validate my-app --strict
  sadl intake my-app --write
  sadl run my-app --category test --yes
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
  ensureSadlState(targetDir, { profile, force: Boolean(options.force) });

  if (meta.adopt) {
    mergeGitignore(targetDir);
  }

  commandManifest([targetDir], { quiet: true });

  console.log(`${meta.adopt ? "Adopted" : "Initialized"} SADL ${profile} project at ${targetDir}`);
  console.log(`Created ${result.created} files, skipped ${result.skipped} existing files.`);
  console.log("Next: fill docs/01_PRD.md, then run: sadl validate .");
}

function commandMigrate(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const profile = String(options.profile || "standard").toLowerCase();
  const legacyConfigPath = path.join(projectDir, ".sadl.config.json");
  const newConfigPath = path.join(projectDir, ".sadl/config.json");
  const hadNewConfig = fs.existsSync(newConfigPath);
  const hadLegacyConfig = fs.existsSync(legacyConfigPath);

  ensureDir(projectDir);
  ensureSadlState(projectDir, { profile, force: Boolean(options.force) });
  mergeGitignore(projectDir);

  if (!hadNewConfig && hadLegacyConfig) {
    const backupPath = path.join(projectDir, ".sadl.config.json.bak");
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(legacyConfigPath, backupPath);
    }
    if (options.removeLegacy) {
      fs.unlinkSync(legacyConfigPath);
    }
  }

  commandManifest([projectDir], { quiet: true });

  console.log(`SADL migration complete at ${projectDir}`);
  console.log("- Machine state initialized under .sadl/.");
  console.log("- Local runtime, approvals, and telemetry are protected by .gitignore.");
  if (hadLegacyConfig) {
    console.log("- Legacy .sadl.config.json was backed up to .sadl.config.json.bak.");
  }
  if (!options.removeLegacy) {
    console.log("- Legacy .sadl.config.json was left in place for compatibility.");
  }
}

function commandPrdCheck(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  ensureProject(projectDir);
  const report = buildPrdCheckReport(projectDir);

  if (options.fixPropose) {
    const proposal = writeRequirementProposals(projectDir, report);
    report.proposal = proposal;
    commandManifest([projectDir], { quiet: true });
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printPrdCheckReport(report);
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

function buildPrdCheckReport(projectDir) {
  const prdPath = path.join(projectDir, "docs/01_PRD.md");
  const archPath = path.join(projectDir, "docs/04_ARCH_SPEC.md");
  const prd = readTextIfExists(prdPath);
  const arch = readTextIfExists(archPath);
  const combined = `${prd}\n\n${arch}`;
  const headings = parseMarkdownSections(combined);
  const conceptResults = PRD_CONCEPTS.map((concept) => {
    const matched = headings.some((heading) => concept.patterns.some((pattern) => pattern.test(heading.title))) ||
      concept.patterns.some((pattern) => pattern.test(combined));
    return {
      key: concept.key,
      label: concept.label,
      present: matched
    };
  });

  const failures = [];
  const warnings = [];
  const missing = conceptResults.filter((item) => !item.present);
  for (const item of missing) {
    failures.push(`Missing PRD concept: ${item.label}`);
  }

  const scopeSection = findSection(headings, [/out of scope/i, /non-?goals/i]);
  if (!scopeSection || sectionHasPlaceholderOnly(scopeSection.body)) {
    failures.push("Scope firewall is empty. Add explicit non-goals or out-of-scope items.");
  }

  const acceptanceSection = findSection(headings, [/acceptance criteria/i, /functional requirements/i]);
  if (!acceptanceSection || sectionHasPlaceholderOnly(acceptanceSection.body)) {
    failures.push("Acceptance criteria are missing or still placeholders.");
  }

  const vagueFindings = findVagueRequirementLines(prd);
  for (const finding of vagueFindings) {
    warnings.push(`Vague requirement word "${finding.word}" needs a measurable criterion near line ${finding.line}.`);
  }

  if (prd.includes("[USER ACTION REQUIRED]")) {
    failures.push("PRD still contains [USER ACTION REQUIRED] placeholders.");
  }

  const extractedRequirements = extractRequirementCandidates(prd);
  if (extractedRequirements.length === 0) {
    warnings.push("No requirement candidates found. Add bullets or numbered acceptance criteria.");
  }

  const score = Math.max(0, Math.round(100 - (failures.length * 12) - (warnings.length * 4)));
  return {
    ok: failures.length === 0,
    project: projectDir,
    prdHash: hashText(prd),
    score,
    concepts: conceptResults,
    requirementCandidates: extractedRequirements,
    vagueFindings,
    failures,
    warnings
  };
}

function printPrdCheckReport(report) {
  console.log(`SADL PRD check for ${report.project}`);
  console.log(report.ok ? `OK (${report.score}/100)` : `FAILED (${report.score}/100)`);

  console.log("\nConcept coverage:");
  for (const item of report.concepts) {
    console.log(`- ${item.present ? "OK" : "MISSING"}: ${item.label}`);
  }

  if (report.failures.length > 0) {
    console.log("\nHard failures:");
    for (const failure of report.failures) console.log(`- ${failure}`);
  }

  if (report.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of report.warnings) console.log(`- ${warning}`);
  }

  if (report.proposal) {
    console.log("\nRequirement proposal:");
    console.log(`- Proposed requirements: ${report.proposal.requirementsAdded}`);
    console.log(`- Traceability updated: ${report.proposal.traceabilityPath}`);
  }
}

function writeRequirementProposals(projectDir, report) {
  const traceabilityPath = path.join(projectDir, ".sadl/traceability.json");
  const traceability = readJson(traceabilityPath) || templateJson(".sadl/traceability.json", "standard");
  traceability.schemaVersion = traceability.schemaVersion || "1.0";
  traceability.sadlVersion = SADL_VERSION;
  traceability.sources = traceability.sources || {};
  traceability.sources.prd = {
    path: "docs/01_PRD.md",
    hash: report.prdHash,
    updatedAt: new Date().toISOString()
  };
  traceability.requirements = traceability.requirements || {};

  let nextNumber = nextRequirementNumber(traceability.requirements);
  let requirementsAdded = 0;
  const existingTitles = new Set(Object.values(traceability.requirements).map((item) => normalizeRequirementTitle(item.title)));

  for (const candidate of report.requirementCandidates) {
    const titleKey = normalizeRequirementTitle(candidate.title);
    if (!titleKey || existingTitles.has(titleKey)) continue;
    const id = `FR-${String(nextNumber).padStart(3, "0")}`;
    traceability.requirements[id] = {
      title: candidate.title,
      status: "TODO",
      source: `docs/01_PRD.md:${candidate.line}`,
      tainted: false,
      humanAcceptance: "PENDING"
    };
    existingTitles.add(titleKey);
    nextNumber += 1;
    requirementsAdded += 1;
  }

  writeFile(traceabilityPath, `${JSON.stringify(traceability, null, 2)}\n`);
  return {
    requirementsAdded,
    traceabilityPath: ".sadl/traceability.json"
  };
}

async function commandIntake(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  if (options.fromJson) {
    const intake = readJson(path.resolve(options.fromJson));
    if (!intake) throw new Error(`could not read intake JSON at ${options.fromJson}`);
    writeIntakeFiles(projectDir, intake);
    console.log(`SADL intake files written to ${projectDir}`);
    return;
  }

  if (options.write || options.interactive) {
    const intake = options.interactive ? await promptForIntake() : await readOrPromptForIntake();
    writeIntakeFiles(projectDir, intake);
    console.log(`SADL intake files written to ${projectDir}`);
    return;
  }

  console.log(`SADL Intake Questions

Run "sadl intake . --write" for an interactive wizard, or "sadl intake . --from-json intake.json" for automation.

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
  if (validation.failures.some((failure) => failure.includes("PRD/traceability"))) {
    throw new Error("Cannot start while PRD and traceability are desynced.");
  }
  console.log(`Active task: ${activeTask || "No active task found"}`);
  console.log(`Last state: ${state || "No state summary found"}`);
  console.log("");
  console.log("Agent bootstrap order:");
  console.log("1. Read AGENTS.md and .sadl/config.json.");
  console.log("2. Read docs/03_STATE.md and active item in docs/02_ROADMAP.md.");
  console.log("3. Read only relevant sections of docs/04_ARCH_SPEC.md and docs/01_PRD.md.");
  console.log("4. Execute the scoped task, validate, checkpoint, then commit if valid.");
}

function commandPlan(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  ensureProject(projectDir);
  const prd = readTextIfExists(path.join(projectDir, "docs/01_PRD.md"));
  const tasks = buildRoadmapTasksFromPrd(prd);
  const roadmap = `# 02_ROADMAP.md: SADL Roadmap Ledger

## Task State Legend
- \`[TODO]\` Ready to start.
- \`[WIP]\` In active implementation.
- \`[DONE]\` Completed and validated.
- \`[BLOCKED]\` Cannot proceed without external action.
- \`[FAILED_TESTS]\` Implementation exists but validation failed.
- \`[NEEDS_REVIEW]\` Human review required.
- \`[WAITING_FOR_APPROVAL]\` Agent must stop until human approval.
- \`[SPLIT_REQUIRED]\` Task is too large and must be atomized.
- \`[ABANDONED]\` No longer planned.

## Current Roadmap
${tasks.map((task, index) => `- [TODO] ${index + 1}. ${task}`).join("\n")}

## Approval Gate
- [NEEDS_REVIEW] Human must approve this generated roadmap before implementation begins.

## Planning Rules
- Keep tasks small enough to complete, validate, checkpoint, and commit in one session.
- Each task must have acceptance criteria.
- Parallel agents may not edit the same source file unless explicitly serialized by the coordinator.
`;

  if (options.write) {
    writeFile(path.join(projectDir, "docs/02_ROADMAP.md"), roadmap);
    commandManifest([projectDir], { quiet: true });
    console.log(`Roadmap written with ${tasks.length} generated tasks.`);
  } else {
    console.log(roadmap);
  }
}

function commandBranch(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const config = readConfig(projectDir, []);
  const task = String(options.task || readActiveTask(projectDir) || "sadl-task");
  const branch = options.name || buildBranchName(config, task);
  const git = getGitStatus(projectDir);
  if (!git.available) throw new Error("cannot create a task branch because this is not a Git repository.");
  runGit(projectDir, ["checkout", "-b", branch]);
  console.log(`Created and checked out branch ${branch}`);
}

function commandWorktree(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const config = readConfig(projectDir, []);
  const task = String(options.task || readActiveTask(projectDir) || "sadl-task");
  const branch = options.name || buildBranchName(config, task);
  const dir = options.dir ? path.resolve(projectDir, options.dir) : path.resolve(projectDir, "..", branch.replace(/[\\/]/g, "-"));
  const git = getGitStatus(projectDir);
  if (!git.available) throw new Error("cannot create a worktree because this is not a Git repository.");
  runGit(projectDir, ["worktree", "add", "-b", branch, dir]);
  console.log(`Created worktree ${dir} on branch ${branch}`);
}

function commandCi(args) {
  const projectDir = path.resolve(args[0] || ".");
  const packageSpec = `create-sadl-project@${SADL_VERSION}`;
  const workflow = `name: SADL Validate

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  sadl-validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx --package ${packageSpec} sadl validate . --strict
`;
  writeFile(path.join(projectDir, ".github/workflows/sadl-validate.yml"), workflow);
  console.log("GitHub Action written to .github/workflows/sadl-validate.yml");
}

function commandDashboard(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const data = buildDashboardData(projectDir);
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  const html = renderDashboardHtml(data);
  const outPath = path.join(projectDir, "docs/sadl-dashboard.html");
  writeFile(outPath, html);
  console.log(`Dashboard written: ${outPath}`);
}

function commandPolicy(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const policies = listPolicies();
  if (options.list || !options.apply) {
    console.log("Available policy packs:");
    for (const policy of policies) console.log(`- ${policy}`);
    return;
  }

  const policyName = String(options.apply);
  if (!policies.includes(policyName)) {
    throw new Error(`unknown policy pack "${policyName}". Use sadl policy --list.`);
  }

  const policy = readJson(path.join(POLICY_DIR, `${policyName}.json`));
  const configPath = getConfigPath(projectDir) || path.join(projectDir, ".sadl/config.json");
  const config = readJson(configPath);
  if (!config) throw new Error("missing or invalid SADL config. Run sadl migrate.");
  const merged = mergePolicy(config, policy);
  writeFile(configPath, `${JSON.stringify(merged, null, 2)}\n`);
  syncLegacyConfigIfPresent(projectDir, merged);
  commandManifest([projectDir], { quiet: true });
  console.log(`Applied policy pack ${policyName}`);
}

function commandAdapter(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const tool = String(options.tool || "").toLowerCase();
  if (!tool) throw new Error("missing --tool. Use codex, claude-code, cursor, gemini, github-copilot, or generic-cli.");
  const adapter = buildAdapterFile(tool);
  writeFile(path.join(projectDir, adapter.path), adapter.content);
  console.log(`Adapter written: ${adapter.path}`);
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

async function commandValidate(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const result = collectValidation(projectDir, {
    strict: Boolean(options.strict),
    category: options.category
  });

  const config = readConfig(projectDir, []);
  if (options.run && config) {
    const runResult = await executeValidationCommands(projectDir, config, {
      category: options.category,
      quiet: true,
      yes: Boolean(options.yes),
      trustCommand: Boolean(options.trustCommand),
      unsafeShell: Boolean(options.unsafeShell)
    });
    result.checks.validationCommandsPassed = runResult.ok;
    result.commandResults = runResult.results;
    for (const item of runResult.results) {
      if (item.status !== 0) {
        result.failures.push(item.approvalRequired
          ? `Command approval required (${item.category}): ${item.command}`
          : `Validation command failed (${item.category}): ${item.command}`);
      }
    }
    result.ok = result.failures.length === 0;
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printValidation(result);
  }

  if (result.failures.length > 0) {
    process.exitCode = 1;
  }
}

async function commandRun(args, options) {
  const projectDir = path.resolve(args[0] || ".");
  const failures = [];
  const config = readConfig(projectDir, failures);
  if (!config) {
    throw new Error(failures[0] || "missing SADL config. Run sadl migrate.");
  }

  const result = await executeValidationCommands(projectDir, config, {
    category: options.category,
    yes: Boolean(options.yes),
    trustCommand: Boolean(options.trustCommand),
    unsafeShell: Boolean(options.unsafeShell)
  });

  for (const item of result.results) {
    console.log(`\n[${item.category}] ${item.command}`);
    if (item.approvalRequired) console.log(item.stderr || "Command approval required.");
    if (item.stdout) console.log(item.stdout.trim());
    if (item.stderr) console.error(item.stderr.trim());
    console.log(`exit=${item.status}${item.timedOut ? " timed-out" : ""}`);
  }

  if (!result.ok) {
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
  if (config) {
    const configPath = getConfigPath(projectDir);
    const configRel = configPath ? normalizePath(path.relative(projectDir, configPath)) : ".sadl/config.json";
    const configSchemaName = configRel === ".sadl/config.json" ? "config.schema.json" : "sadl-config.schema.json";
    const configSchema = readJson(path.join(SCHEMA_DIR, configSchemaName));
    const schemaResult = validateSchema(configSchema, config);
    checks.configSchemaValid = schemaResult.ok;
    for (const error of schemaResult.errors) {
      failures.push(`${configRel} schema: ${error}`);
    }
  }

  checks.machineStateValid = checkSadlStateFiles(projectDir, warnings, failures);
  checks.prdTraceabilitySync = checkPrdTraceabilitySync(projectDir, warnings, failures);
  checks.gitignoreSecrets = checkGitignore(projectDir, warnings, failures);
  checks.noTrackedSecrets = checkTrackedSecrets(projectDir, failures, warnings);
  checks.noSecretLeaks = scanSecretLeaks(projectDir, warnings);
  checks.statePresent = checkState(projectDir, options, warnings, failures);
  checks.roadmapPresent = checkRoadmap(projectDir, warnings);
  checks.manifestFresh = checkManifest(projectDir, warnings);
  checks.sessionLogsValid = checkSessionLogs(projectDir, warnings, failures);

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

  const includeRoots = ["AGENTS.md", ".sadl.config.json", ".sadl/config.json", ".sadl/traceability.json", "docs", "src", "tests", "package.json", "pyproject.toml"];
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
  const statusCounts = countValues(logs.map((log) => log.status).filter(Boolean));
  const approvalCount = logs.reduce((sum, log) => sum + Number(log.approvalsRequested || 0), 0);
  const waitingMinutes = logs.reduce((sum, log) => sum + Number(log.waitingMinutes || 0), 0);
  const timestamp = new Date().toISOString();

  const report = `# SADL Dream Report

Generated: ${timestamp}

## Purpose
This report is review-only. It may suggest improvements, but agents must not auto-apply changes to AGENTS.md, .sadl/config.json, or architecture docs without human approval.

## Session Summary
- Sessions analyzed: ${logs.length}
- Non-DONE sessions: ${failedTasks.length}
- Approval requests: ${approvalCount}
- Waiting minutes: ${waitingMinutes}

## Status Distribution
${formatCountMap(statusCounts, { includeSingles: true })}

## Repeated Commands
${formatCountMap(repeatedCommands)}

## Repeated Blockers
${formatCountMap(repeatedBlockers)}

## Proposed Improvements
${buildDreamSuggestions(repeatedCommands, repeatedBlockers, failedTasks, { approvalCount, waitingMinutes, statusCounts })}
`;

  const outPath = path.join(projectDir, "docs/dreams", `${timestamp.replace(/[:.]/g, "-")}.md`);
  writeFile(outPath, report);
  console.log(`Dream report written: ${outPath}`);
}

async function commandCommit(args, options) {
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

  const paths = await resolveCommitPaths(projectDir, args.slice(1), options, git);
  validateCommitPaths(projectDir, paths, options);

  const message = String(options.message || "sadl: checkpoint session");
  runGit(projectDir, ["add", "--", ...paths]);
  const commit = runGit(projectDir, ["commit", "-m", message]);
  console.log(commit.stdout.trim() || "Commit complete.");
}

async function resolveCommitPaths(projectDir, positionalPaths, options, git) {
  const explicitPaths = [
    ...splitPathOption(options.paths),
    ...positionalPaths
  ].map((item) => normalizePath(item)).filter(Boolean);

  if (explicitPaths.length > 0) return Array.from(new Set(explicitPaths));

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("sadl commit requires explicit --paths in non-interactive/agent use. Example: sadl commit . --paths src/app.ts,tests/app.test.ts --message \"sadl: complete task\"");
  }

  if (!git.changedFiles.length) {
    throw new Error("no changed files to commit.");
  }

  console.log("Changed files:");
  git.changedFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question("Select files to stage, e.g. 1,3-5 or all\n> ")).trim();
    return parseFileSelection(answer, git.changedFiles);
  } finally {
    rl.close();
  }
}

function validateCommitPaths(projectDir, paths, options) {
  if (!paths.length) throw new Error("no commit paths selected.");
  for (const relPath of paths) {
    if (isForbiddenCommitPath(relPath)) {
      throw new Error(`refusing to commit local-only or secret-like path: ${relPath}`);
    }
  }

  const taskId = String(options.taskId || readRuntimeActiveTask(projectDir) || inferTaskId(readActiveTask(projectDir)) || "");
  const allowedPaths = taskId ? getTaskAllowedPaths(projectDir, taskId) : [];
  if (allowedPaths.length === 0) return;

  const outsideScope = paths.filter((relPath) => !allowedPaths.some((pattern) => pathMatchesPattern(relPath, pattern)));
  if (outsideScope.length > 0) {
    throw new Error(`commit path outside active task allowed_paths for ${taskId}: ${outsideScope.join(", ")}`);
  }
}

function splitPathOption(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(splitPathOption);
  return String(value).split(/[,\n;]/).map((item) => item.trim()).filter(Boolean);
}

function parseFileSelection(answer, changedFiles) {
  if (answer.toLowerCase() === "all") return changedFiles;
  const selected = new Set();
  for (const part of answer.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const range = trimmed.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let index = start; index <= end; index += 1) {
        if (changedFiles[index - 1]) selected.add(changedFiles[index - 1]);
      }
      continue;
    }
    const number = Number(trimmed);
    if (Number.isInteger(number) && changedFiles[number - 1]) {
      selected.add(changedFiles[number - 1]);
    }
  }
  return Array.from(selected);
}

function isForbiddenCommitPath(relPath) {
  const normalized = normalizePath(relPath);
  if (path.isAbsolute(relPath) || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) return true;
  if (LOCAL_SADL_FILES.includes(normalized)) return true;
  if (normalized.startsWith(".sadl/cache/") || normalized.startsWith(".sadl/locks/")) return true;
  if (normalized === ".sadlignore-secrets") return true;
  if (normalized === ".env.example" || normalized.endsWith("/.env.example")) return false;
  return SECRET_FILE_PATTERNS.some((pattern) => pattern.test(path.basename(normalized)) || pattern.test(normalized));
}

function getTaskAllowedPaths(projectDir, taskId) {
  const traceability = readJson(path.join(projectDir, ".sadl/traceability.json"));
  const task = traceability?.tasks?.[taskId];
  return Array.isArray(task?.allowedPaths) ? task.allowedPaths : [];
}

function pathMatchesPattern(relPath, pattern) {
  const normalizedPath = normalizePath(relPath);
  const normalizedPattern = normalizePath(pattern).replace(/^\.\//, "");
  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3);
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  }
  if (normalizedPattern.endsWith("/*")) {
    const prefix = normalizedPattern.slice(0, -2);
    const rest = normalizedPath.slice(prefix.length + 1);
    return normalizedPath.startsWith(`${prefix}/`) && !rest.includes("/");
  }
  return normalizedPath === normalizedPattern || normalizedPath.startsWith(`${normalizedPattern}/`);
}

function readConfig(projectDir, failures) {
  const configPath = getConfigPath(projectDir);
  if (!configPath) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    failures.push(`Invalid ${normalizePath(path.relative(projectDir, configPath))}: ${error.message}`);
    return null;
  }
}

async function promptForIntake() {
  const rl = readline.createInterface({ input, output });
  try {
    const ask = async (question) => (await rl.question(`${question}\n> `)).trim();
    const askList = async (question) => splitLines(await ask(`${question} (comma or semicolon separated)`));

    return {
      productIntent: await ask("What are we building, for whom, and why?"),
      targetUsers: await askList("Who are the target users or roles?"),
      mvpScope: await askList("What is in the MVP?"),
      nonGoals: await askList("What is explicitly out of scope?"),
      coreWorkflows: await askList("What are the core workflows?"),
      acceptanceCriteria: await askList("What observable outcomes define done?"),
      dataModel: await ask("What entities, relationships, privacy, or retention rules matter?"),
      technicalPreferences: {
        language: await ask("Preferred language/runtime?"),
        framework: await ask("Preferred framework?"),
        packageManager: await ask("Preferred package manager?"),
        database: await ask("Preferred database/storage?"),
        deployment: await ask("Deployment target?")
      },
      integrations: await askList("External integrations?"),
      secretNames: normalizeSecretNames(await askList("Required environment variable names only?")),
      validationCommands: {
        lint: splitLines(await ask("Lint commands?")),
        test: splitLines(await ask("Test commands?")),
        typecheck: splitLines(await ask("Typecheck commands?")),
        build: splitLines(await ask("Build commands?"))
      },
      agentPolicy: {
        autonomy: await ask("Agent autonomy level? low, medium, high?"),
        approvals: await askList("What requires human approval?")
      }
    };
  } finally {
    rl.close();
  }
}

async function readOrPromptForIntake() {
  if (!process.stdin.isTTY) {
    const stdinText = fs.readFileSync(0, "utf8");
    if (stdinText.trim()) {
      return intakeFromAnswerLines(stdinText.split(/\r?\n/));
    }
  }
  return promptForIntake();
}

function intakeFromAnswerLines(lines) {
  const answers = [...lines];
  const next = () => String(answers.shift() || "").trim();
  return {
    productIntent: next(),
    targetUsers: splitLines(next()),
    mvpScope: splitLines(next()),
    nonGoals: splitLines(next()),
    coreWorkflows: splitLines(next()),
    acceptanceCriteria: splitLines(next()),
    dataModel: next(),
    technicalPreferences: {
      language: next(),
      framework: next(),
      packageManager: next(),
      database: next(),
      deployment: next()
    },
    integrations: splitLines(next()),
    secretNames: normalizeSecretNames(splitLines(next())),
    validationCommands: {
      lint: splitLines(next()),
      test: splitLines(next()),
      typecheck: splitLines(next()),
      build: splitLines(next())
    },
    agentPolicy: {
      autonomy: next(),
      approvals: splitLines(next())
    }
  };
}

function writeIntakeFiles(projectDir, intake) {
  ensureDir(projectDir);
  ensureDir(path.join(projectDir, "docs"));
  intake.secretNames = normalizeSecretNames(intake.secretNames || []);
  const schema = readJson(path.join(SCHEMA_DIR, "intake.schema.json"));
  const result = validateSchema(schema, intake);
  if (!result.ok) {
    throw new Error(`intake schema failed:\n${result.errors.join("\n")}`);
  }

  writeFile(path.join(projectDir, "docs/01_PRD.md"), renderPrd(intake));
  writeFile(path.join(projectDir, "docs/04_ARCH_SPEC.md"), renderArchSpec(intake));
  writeFile(path.join(projectDir, ".env.example"), renderEnvExample(intake.secretNames || []));
  writeFile(path.join(projectDir, "docs/setup-env.md"), renderSetupEnv(intake.secretNames || []));
  updateConfigFromIntake(projectDir, intake);
  commandManifest([projectDir], { quiet: true });
}

function renderPrd(intake) {
  return `# 01_PRD.md: Product Requirements

## Status
Approved for planning when reviewed by a human.

## 1. Product Intent
${intake.productIntent}

## 2. Target Users And Roles
${formatList(intake.targetUsers)}

## 3. MVP Scope
${formatList(intake.mvpScope)}

## 4. Non-Goals
${formatList(intake.nonGoals)}

## 5. Core Workflows
${formatList(intake.coreWorkflows || [])}

## 6. Acceptance Criteria
${formatList(intake.acceptanceCriteria)}

## 7. Data And Privacy Requirements
${intake.dataModel || "No special data requirements recorded."}

## 8. External Integrations
${formatList(intake.integrations || [])}

## 9. Operational Requirements
- Validation commands are defined in \`.sadl/config.json\`.
- Secrets are documented by name only in \`.env.example\` and \`docs/setup-env.md\`.

## 10. Open Questions
- None recorded.
`;
}

function renderArchSpec(intake) {
  const tech = intake.technicalPreferences || {};
  return `# 04_ARCH_SPEC.md: Architecture Specification

## Status
Approved for implementation when reviewed by a human.

## 1. Technical Stack
- Language/runtime: ${tech.language || "unspecified"}
- Framework: ${tech.framework || "unspecified"}
- Package manager: ${tech.packageManager || "unspecified"}
- Database/storage: ${tech.database || "unspecified"}
- Deployment target: ${tech.deployment || "unspecified"}
- Test framework: ${tech.testFramework || "unspecified"}

## 2. Architecture Boundaries
- UI/presentation: keep user interaction code separate from domain logic.
- Domain/business logic: keep business rules framework-light and testable.
- Data access: isolate persistence details behind service/repository modules.
- External services: isolate third-party APIs behind adapters.
- Tests: mirror changed source behavior with focused tests.

## 3. Coding Standards
- Typing rules: prefer explicit types and avoid weak catch-all types.
- Formatting/linting: use configured project tooling.
- Error handling: return actionable errors and avoid swallowing failures.
- Logging: avoid secrets and personal data.
- Accessibility: keep user-facing UI keyboard and screen-reader friendly.

## 4. Data Model
${intake.dataModel || "No data model recorded."}

## 5. Security Rules
- Authentication: document chosen auth approach before implementation.
- Authorization: enforce role checks server-side.
- Secret handling: agents may know secret names, never values.
- Input validation: validate external inputs at boundaries.
- Audit logging: record important state changes when required by the PRD.

## 6. Validation Commands
\`\`\`text
lint: ${(intake.validationCommands?.lint || []).join(", ")}
test: ${(intake.validationCommands?.test || []).join(", ")}
typecheck: ${(intake.validationCommands?.typecheck || []).join(", ")}
build: ${(intake.validationCommands?.build || []).join(", ")}
\`\`\`

## 7. Integration Contracts
${formatList(intake.integrations || [])}

## 8. Architecture Decision Records
Architecture changes must be proposed as \`docs/decisions/ADR-XXXX-title.md\` and approved by a human before implementation.
`;
}

function renderEnvExample(secretNames) {
  const lines = normalizeSecretNames(secretNames).map((name) => `${name}=`);
  return `# Copy to a local .env file and fill values outside Git.
# Agents may read this file for variable names only.

${lines.join("\n")}
`;
}

function renderSetupEnv(secretNames) {
  return `# Environment Setup

This file documents required environment variable names only. Do not store secret values here.

## Required Variables

| Name | Purpose | Required For |
| --- | --- | --- |
${normalizeSecretNames(secretNames).map((name) => `| \`${name}\` | TODO | Local development |`).join("\n")}

## Agent Rules

Agents may read this file and \`.env.example\` for variable names. Agents must not read \`.env\` files or request secret values in chat.
`;
}

function updateConfigFromIntake(projectDir, intake) {
  const configPath = getConfigPath(projectDir) || path.join(projectDir, ".sadl/config.json");
  const config = readJson(configPath);
  if (!config) return;
  config.validation = {
    ...config.validation,
    ...intake.validationCommands
  };
  if (intake.agentPolicy?.approvals?.length) {
    config.approvalPolicy = config.approvalPolicy || {};
    config.approvalPolicy.requireHumanFor = Array.from(new Set([
      ...(config.approvalPolicy.requireHumanFor || []),
      ...intake.agentPolicy.approvals
    ]));
  }
  writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  syncLegacyConfigIfPresent(projectDir, config);
}

async function executeValidationCommands(projectDir, config, options = {}) {
  const validation = config.validation || {};
  const categories = options.category ? [String(options.category)] : ["lint", "typecheck", "test", "build"];
  const timeout = Number(config.validationTimeoutMs || 120000);
  const results = [];
  const taskId = options.taskId || readRuntimeActiveTask(projectDir) || inferTaskId(readActiveTask(projectDir));

  for (const category of categories) {
    const commands = validation[category] || [];
    for (const command of commands) {
      if (!command) continue;
      const approval = await ensureCommandApproved(projectDir, config, command, {
        ...options,
        taskId
      });
      if (!approval.ok) {
        results.push({
          category,
          command,
          status: 1,
          timedOut: false,
          stdout: "",
          stderr: approval.message,
          approvalRequired: true
        });
        continue;
      }
      let execution;
      try {
        execution = buildCommandExecution(command, options);
      } catch (error) {
        results.push({
          category,
          command,
          status: 1,
          timedOut: false,
          stdout: "",
          stderr: error.message
        });
        continue;
      }
      const result = spawnSync(execution.file, execution.args, {
        cwd: projectDir,
        shell: execution.shell,
        encoding: "utf8",
        timeout
      });
      results.push({
        category,
        command,
        status: result.status === null ? 1 : result.status,
        timedOut: Boolean(result.error && result.error.code === "ETIMEDOUT"),
        stdout: result.stdout || "",
        stderr: result.stderr || (result.error ? result.error.message : "")
      });
    }
  }

  return {
    ok: results.every((result) => result.status === 0),
    results
  };
}

async function ensureCommandApproved(projectDir, config, command, options = {}) {
  const requiresApproval = config?.security?.requireCommandApproval !== false;
  if (!requiresApproval) return { ok: true, fingerprint: null };

  const fingerprint = buildCommandFingerprint(projectDir, config, command, options);
  const approvals = readApprovals(projectDir);
  const trusted = (approvals.trustedCommands || []).some((entry) => {
    if (entry.fingerprint !== fingerprint) return false;
    if (!entry.expiresAt) return true;
    return new Date(entry.expiresAt).getTime() > Date.now();
  });
  if (trusted || options.yes) return { ok: true, fingerprint };

  if (options.trustCommand) {
    approvals.trustedCommands = approvals.trustedCommands || [];
    approvals.trustedCommands.push({
      fingerprint,
      command,
      taskId: options.taskId || null,
      approvedAt: new Date().toISOString(),
      expiresAt: null
    });
    writeApprovals(projectDir, approvals);
    return { ok: true, fingerprint };
  }

  if (process.stdin.isTTY && process.stdout.isTTY) {
    const approved = await promptYesNo(`SADL is about to run "${command}". Approve once?`, false);
    if (approved) return { ok: true, fingerprint };
  }

  return {
    ok: false,
    fingerprint,
    message: `Command approval required for "${command}". Re-run with --yes for CI/one-shot execution or --trust-command to store a local approval.`
  };
}

function buildCommandFingerprint(projectDir, config, command, options = {}) {
  const payload = {
    command,
    cwd: normalizePath(projectDir),
    taskId: options.taskId || null,
    sadlVersion: SADL_VERSION,
    configHash: hashText(JSON.stringify(config || {})),
    packageScriptsHash: hashPackageScripts(projectDir),
    lockfileHash: hashLockfiles(projectDir),
    envKeyNamesHash: hashText(Object.keys(process.env).sort().join("\n"))
  };
  return hashText(JSON.stringify(payload));
}

function readApprovals(projectDir) {
  const filePath = path.join(projectDir, ".sadl/approvals.json");
  const approvals = readJson(filePath);
  if (approvals) return approvals;
  return {
    schemaVersion: "1.0",
    sadlVersion: SADL_VERSION,
    trustedCommands: [],
    secretOverrides: []
  };
}

function writeApprovals(projectDir, approvals) {
  approvals.schemaVersion = approvals.schemaVersion || "1.0";
  approvals.sadlVersion = approvals.sadlVersion || SADL_VERSION;
  approvals.trustedCommands = approvals.trustedCommands || [];
  approvals.secretOverrides = approvals.secretOverrides || [];
  writeFile(path.join(projectDir, ".sadl/approvals.json"), `${JSON.stringify(approvals, null, 2)}\n`);
}

async function promptYesNo(question, defaultValue) {
  const rl = readline.createInterface({ input, output });
  try {
    const suffix = defaultValue ? "[Y/n]" : "[y/N]";
    const answer = (await rl.question(`${question} ${suffix}\n> `)).trim().toLowerCase();
    if (!answer) return defaultValue;
    return ["y", "yes"].includes(answer);
  } finally {
    rl.close();
  }
}

function buildCommandExecution(command, options = {}) {
  if (containsShellSyntax(command)) {
    if (!options.unsafeShell) {
      throw new Error(`Command contains shell syntax and is blocked by default: ${command}. Re-run with --unsafe-shell only if you trust it.`);
    }
    return { file: command, args: [], shell: true };
  }
  const parts = splitCommand(command);
  if (parts.length === 0) throw new Error("Empty command.");
  return {
    file: resolveExecutable(parts[0]),
    args: parts.slice(1),
    shell: false
  };
}

function containsShellSyntax(command) {
  return /(\|\||&&|[|;<>]|`|\$\()/.test(command);
}

function splitCommand(command) {
  const parts = [];
  let current = "";
  let quote = null;
  let escaped = false;

  for (const char of String(command)) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) parts.push(current);
  return parts;
}

function resolveExecutable(executable) {
  if (process.platform !== "win32") return executable;
  if (executable === "npm" || executable === "npx" || executable === "pnpm" || executable === "yarn") {
    return `${executable}.cmd`;
  }
  return executable;
}

function hashPackageScripts(projectDir) {
  const packageJson = readJson(path.join(projectDir, "package.json"));
  return hashText(JSON.stringify(packageJson?.scripts || {}));
}

function hashLockfiles(projectDir) {
  const lockfiles = ["package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock"];
  const parts = [];
  for (const file of lockfiles) {
    const filePath = path.join(projectDir, file);
    if (fs.existsSync(filePath)) {
      parts.push(`${file}:${hashFile(filePath)}`);
    }
  }
  return hashText(parts.join("\n"));
}

function checkSessionLogs(projectDir, warnings, failures) {
  const schema = readJson(path.join(SCHEMA_DIR, "session-log.schema.json"));
  const logsDir = path.join(projectDir, "docs/session_logs");
  if (!fs.existsSync(logsDir)) return true;
  let ok = true;
  for (const file of listFiles(logsDir).filter((item) => item.endsWith(".json"))) {
    const log = readJson(file);
    if (!log) {
      warnings.push(`Invalid session log JSON: ${normalizePath(path.relative(projectDir, file))}`);
      ok = false;
      continue;
    }
    const result = validateSchema(schema, log);
    if (!result.ok) {
      ok = false;
      failures.push(`Session log schema failed for ${normalizePath(path.relative(projectDir, file))}: ${result.errors.join("; ")}`);
    }
  }
  return ok;
}

function buildRoadmapTasksFromPrd(prd) {
  const bullets = prd
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => line && !line.includes("[USER ACTION REQUIRED]"))
    .slice(0, 12);
  if (bullets.length > 0) return bullets.map((item) => `Implement: ${item}`);
  return [
    "Complete project bootstrap and validation setup",
    "Implement the first MVP workflow",
    "Add tests for the first MVP workflow",
    "Checkpoint and prepare the next roadmap slice"
  ];
}

function buildBranchName(config, task) {
  const prefix = config?.commitPolicy?.defaultBranchPrefix || "sadl/task-";
  return `${prefix}${slugify(task).slice(0, 60)}`;
}

function buildDashboardData(projectDir) {
  const logsDir = path.join(projectDir, "docs/session_logs");
  const logs = fs.existsSync(logsDir)
    ? listFiles(logsDir).filter((file) => file.endsWith(".json")).map((file) => readJson(file)).filter(Boolean)
    : [];
  const statusCounts = Object.fromEntries(countValues(logs.map((log) => log.status)));
  const blockerCounts = countValues(logs.map((log) => log.blocker).filter(Boolean)).slice(0, 10);
  const commandCounts = countValues(logs.flatMap((log) => log.commandsRun || [])).slice(0, 10);
  return {
    generatedAt: new Date().toISOString(),
    project: projectDir,
    activeTask: readActiveTask(projectDir),
    state: readStateSummary(projectDir),
    git: getGitStatus(projectDir),
    sessions: logs.length,
    statusCounts,
    waitingMinutes: logs.reduce((sum, log) => sum + Number(log.waitingMinutes || 0), 0),
    approvalsRequested: logs.reduce((sum, log) => sum + Number(log.approvalsRequested || 0), 0),
    topBlockers: blockerCounts,
    repeatedCommands: commandCounts
  };
}

function renderDashboardHtml(data) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SADL Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1f2937; }
    main { max-width: 960px; margin: 0 auto; }
    h1, h2 { margin-bottom: 8px; }
    section { border-top: 1px solid #d1d5db; padding: 20px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .metric { border: 1px solid #d1d5db; padding: 12px; border-radius: 6px; }
    .metric strong { display: block; font-size: 24px; }
    code { background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
<main>
  <h1>SADL Dashboard</h1>
  <p>Generated ${escapeHtml(data.generatedAt)}</p>
  <section>
    <h2>Current State</h2>
    <p><strong>Active task:</strong> ${escapeHtml(data.activeTask || "none")}</p>
    <p><strong>State:</strong> ${escapeHtml(data.state || "none")}</p>
    <p><strong>Git:</strong> ${data.git.available ? `${data.git.changedFiles.length} changed files` : "not a git repo"}</p>
  </section>
  <section class="grid">
    <div class="metric"><span>Sessions</span><strong>${data.sessions}</strong></div>
    <div class="metric"><span>Approval Requests</span><strong>${data.approvalsRequested}</strong></div>
    <div class="metric"><span>Waiting Minutes</span><strong>${data.waitingMinutes}</strong></div>
  </section>
  <section>
    <h2>Status Counts</h2>
    ${renderKeyValueList(Object.entries(data.statusCounts))}
  </section>
  <section>
    <h2>Top Blockers</h2>
    ${renderCountList(data.topBlockers)}
  </section>
  <section>
    <h2>Repeated Commands</h2>
    ${renderCountList(data.repeatedCommands)}
  </section>
</main>
</body>
</html>
`;
}

function listPolicies() {
  if (!fs.existsSync(POLICY_DIR)) return [];
  return fs.readdirSync(POLICY_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();
}

function mergePolicy(config, policy) {
  const outputConfig = { ...config };
  for (const [key, value] of Object.entries(policy.config || {})) {
    if (Array.isArray(value)) {
      outputConfig[key] = Array.from(new Set([...(outputConfig[key] || []), ...value]));
    } else if (value && typeof value === "object") {
      outputConfig[key] = deepMerge(outputConfig[key] || {}, value);
    } else {
      outputConfig[key] = value;
    }
  }
  outputConfig.policyPack = policy.name || outputConfig.policyPack;
  return outputConfig;
}

function buildAdapterFile(tool) {
  const common = "This repository uses SADL. Follow AGENTS.md as the source of truth. Read .sadl/config.json, docs/03_STATE.md, and docs/02_ROADMAP.md before editing. Do not read .env files or modify protected files without approval.";
  const adapters = {
    "claude-code": {
      path: "CLAUDE.md",
      content: `# CLAUDE.md\n\n${common}\n`
    },
    cursor: {
      path: ".cursor/rules/sadl.mdc",
      content: `---\nalwaysApply: true\n---\n${common}\n`
    },
    codex: {
      path: "docs/adapters/codex.md",
      content: `# Codex Adapter\n\nCodex can use the repository-level AGENTS.md directly. Keep AGENTS.md as the canonical SADL operating rules.\n\n${common}\n`
    },
    gemini: {
      path: "GEMINI.md",
      content: `# GEMINI.md\n\n${common}\n`
    },
    "github-copilot": {
      path: ".github/copilot-instructions.md",
      content: `# GitHub Copilot Instructions\n\n${common}\n`
    },
    "generic-cli": {
      path: "SADL_AGENT_PROMPT.md",
      content: `# SADL Agent Prompt\n\n${common}\n`
    }
  };
  if (!adapters[tool]) {
    throw new Error(`unknown adapter "${tool}"`);
  }
  return adapters[tool];
}

function ensureProject(projectDir) {
  for (const file of ["docs/02_ROADMAP.md", "docs/03_STATE.md", "docs/05_SESSION_LOG.md"]) {
    if (!fs.existsSync(path.join(projectDir, file))) {
      throw new Error(`not a SADL project or missing ${file}. Run sadl init first.`);
    }
  }
}

function ensureSadlState(projectDir, options = {}) {
  const profile = String(options.profile || "standard").toLowerCase();
  ensureDir(path.join(projectDir, ".sadl"));
  for (const dir of LOCAL_SADL_DIRS) {
    ensureDir(path.join(projectDir, dir));
  }

  const configPath = path.join(projectDir, ".sadl/config.json");
  const legacyConfig = readJson(path.join(projectDir, ".sadl.config.json"));
  const existingConfig = readJson(configPath);
  if (options.force || !existingConfig) {
    const merged = normalizeSadlConfig(existingConfig || legacyConfig || {}, profile);
    writeFile(configPath, `${JSON.stringify(merged, null, 2)}\n`);
  }

  ensureJsonStateFile(projectDir, ".sadl/traceability.json", () => templateJson(".sadl/traceability.json", profile), options);
  ensureJsonStateFile(projectDir, ".sadl/runtime.json", () => templateJson(".sadl/runtime.json", profile), options);
  ensureJsonStateFile(projectDir, ".sadl/approvals.json", () => templateJson(".sadl/approvals.json", profile), options);
  ensureJsonStateFile(projectDir, ".sadl/telemetry.json", () => templateJson(".sadl/telemetry.json", profile), options);
}

function ensureJsonStateFile(projectDir, relPath, factory, options = {}) {
  const filePath = path.join(projectDir, relPath);
  if (!options.force && fs.existsSync(filePath)) return;
  writeFile(filePath, `${JSON.stringify(factory(), null, 2)}\n`);
}

function templateJson(relPath, profile) {
  const templatePath = path.join(TEMPLATE_DIR, relPath);
  const content = applyReplacements(fs.readFileSync(templatePath, "utf8"), {
    "__SADL_PROFILE__": profile,
    "__SADL_VERSION__": SADL_VERSION
  });
  return JSON.parse(content);
}

function normalizeSadlConfig(config, profile) {
  const base = templateJson(".sadl/config.json", profile);
  const merged = deepMerge(base, config || {});
  merged.$schema = "https://sadl.dev/schemas/config.schema.json";
  merged.schemaVersion = merged.schemaVersion || "1.0";
  merged.sadlVersion = SADL_VERSION;
  merged.profile = ["lite", "standard", "enterprise"].includes(merged.profile) ? merged.profile : profile;
  merged.security = {
    requireCommandApproval: true,
    blockSecrets: true,
    ...(merged.security || {})
  };
  merged.executionPolicy = ["prototype", "enterprise", "regulated"].includes(merged.executionPolicy)
    ? merged.executionPolicy
    : "enterprise";
  return merged;
}

function getConfigPath(projectDir) {
  const primary = path.join(projectDir, ".sadl/config.json");
  if (fs.existsSync(primary)) return primary;
  const legacy = path.join(projectDir, ".sadl.config.json");
  if (fs.existsSync(legacy)) return legacy;
  return null;
}

function syncLegacyConfigIfPresent(projectDir, config) {
  const legacyPath = path.join(projectDir, ".sadl.config.json");
  if (!fs.existsSync(legacyPath)) return;
  const legacy = {
    ...config,
    $schema: "https://sadl.dev/schemas/sadl-config.schema.json"
  };
  writeFile(legacyPath, `${JSON.stringify(legacy, null, 2)}\n`);
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

function readRuntimeActiveTask(projectDir) {
  const runtime = readJson(path.join(projectDir, ".sadl/runtime.json"));
  return runtime?.activeSession?.activeTask || null;
}

function inferTaskId(value) {
  const match = String(value || "").match(/\bTASK-[0-9]+\b/i);
  return match ? match[0].toUpperCase() : null;
}

function readStateSummary(projectDir) {
  const state = readTextIfExists(path.join(projectDir, "docs/03_STATE.md"));
  const status = state.match(/Task Status:\s*(.+)/i);
  return status ? status[1].trim() : null;
}

function parseMarkdownSections(content) {
  const lines = String(content || "").split(/\r?\n/);
  const sections = [];
  let current = null;

  lines.forEach((line, index) => {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      if (current) sections.push(current);
      current = {
        level: heading[1].length,
        title: heading[2].replace(/`/g, "").trim(),
        line: index + 1,
        body: []
      };
    } else if (current) {
      current.body.push(line);
    }
  });
  if (current) sections.push(current);
  return sections.map((section) => ({
    ...section,
    body: section.body.join("\n").trim()
  }));
}

function findSection(sections, patterns) {
  return sections.find((section) => patterns.some((pattern) => pattern.test(section.title)));
}

function sectionHasPlaceholderOnly(body) {
  const meaningful = String(body || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean)
    .filter((line) => !line.includes("[USER ACTION REQUIRED]"))
    .filter((line) => !/^what|who|why|list|describe|none recorded/i.test(line));
  return meaningful.length === 0;
}

function findVagueRequirementLines(content) {
  const findings = [];
  const lines = String(content || "").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!/^(\s*[-*]|\s*\d+\.)\s+/.test(line)) return;
    if (MEASUREMENT_HINT_PATTERN.test(line)) return;
    for (const word of VAGUE_REQUIREMENT_WORDS) {
      const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
      if (pattern.test(line)) {
        findings.push({ line: index + 1, word, text: line.trim() });
      }
    }
  });
  return findings;
}

function extractRequirementCandidates(content) {
  const candidates = [];
  const sections = parseMarkdownSections(content);
  const candidateSections = sections.filter((section) => [
    /acceptance criteria/i,
    /functional requirements/i,
    /core workflows/i,
    /mvp scope/i
  ].some((pattern) => pattern.test(section.title)));

  for (const section of candidateSections) {
    const lines = section.body.split(/\r?\n/);
    lines.forEach((line, index) => {
      const bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/);
      if (!bullet) return;
      const title = bullet[1].replace(/\[USER ACTION REQUIRED\]/g, "").trim();
      if (!title || title.length < 6) return;
      candidates.push({
        title,
        line: section.line + index + 1
      });
    });
  }
  return candidates;
}

function nextRequirementNumber(requirements) {
  const numbers = Object.keys(requirements || {})
    .map((id) => id.match(/^FR-(\d+)$/))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

function normalizeRequirementTitle(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkGitignore(projectDir, warnings, failures) {
  const gitignorePath = path.join(projectDir, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    failures.push("Missing .gitignore with secret exclusions.");
    return false;
  }
  const content = fs.readFileSync(gitignorePath, "utf8");
  const required = [
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    ".sadl/runtime.json",
    ".sadl/approvals.json",
    ".sadl/telemetry.json",
    ".sadl/cache/",
    ".sadl/locks/"
  ];
  const missing = required.filter((pattern) => !content.includes(pattern));
  if (missing.length > 0) {
    warnings.push(`.gitignore is missing recommended secret patterns: ${missing.join(", ")}`);
    return false;
  }
  return true;
}

function checkSadlStateFiles(projectDir, warnings, failures) {
  const stateFiles = [
    [".sadl/config.json", "config.schema.json", true],
    [".sadl/traceability.json", "traceability.schema.json", true],
    [".sadl/runtime.json", "runtime.schema.json", false],
    [".sadl/approvals.json", "approvals.schema.json", false],
    [".sadl/telemetry.json", "telemetry.schema.json", false]
  ];
  let ok = true;

  for (const [relPath, schemaName, committed] of stateFiles) {
    const filePath = path.join(projectDir, relPath);
    if (!fs.existsSync(filePath)) {
      ok = false;
      const message = `Missing SADL ${committed ? "team" : "local"} state file: ${relPath}. Run sadl migrate.`;
      if (committed) failures.push(message);
      else warnings.push(message);
      continue;
    }
    const value = readJson(filePath);
    if (!value) {
      ok = false;
      failures.push(`Invalid SADL state JSON: ${relPath}`);
      continue;
    }
    const schema = readJson(path.join(SCHEMA_DIR, schemaName));
    const result = validateSchema(schema, value);
    if (!result.ok) {
      ok = false;
      failures.push(`${relPath} schema: ${result.errors.join("; ")}`);
    }
  }

  for (const relPath of LOCAL_SADL_DIRS) {
    if (!fs.existsSync(path.join(projectDir, relPath))) {
      warnings.push(`Missing SADL local directory: ${relPath}. Run sadl migrate.`);
      ok = false;
    }
  }

  return ok;
}

function checkPrdTraceabilitySync(projectDir, warnings, failures) {
  const prdPath = path.join(projectDir, "docs/01_PRD.md");
  const traceabilityPath = path.join(projectDir, ".sadl/traceability.json");
  if (!fs.existsSync(prdPath) || !fs.existsSync(traceabilityPath)) return false;

  const prd = readTextIfExists(prdPath);
  const traceability = readJson(traceabilityPath);
  if (!traceability) return false;

  const recordedHash = traceability.sources?.prd?.hash;
  const currentHash = hashText(prd);
  const requirementCount = Object.keys(traceability.requirements || {}).length;

  if (!recordedHash) {
    if (requirementCount > 0) {
      failures.push("PRD/traceability sync lock missing. Run sadl prd-check --fix-propose.");
      return false;
    }
    warnings.push("PRD is not yet sync-locked to traceability. Run sadl prd-check --fix-propose when the PRD is ready.");
    return true;
  }

  if (recordedHash !== currentHash) {
    failures.push("PRD/traceability desync detected. Run sadl prd-check --fix-propose after reviewing PRD changes.");
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
    if (LOCAL_SADL_FILES.includes(normalized) || normalized.startsWith(".sadl/cache/") || normalized.startsWith(".sadl/locks/")) return true;
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
  const additions = [
    ".env",
    ".env.*",
    "!.env.example",
    "*.pem",
    "*.key",
    "*.p12",
    "*.pfx",
    ".sadlignore-secrets",
    ".sadl/runtime.json",
    ".sadl/approvals.json",
    ".sadl/telemetry.json",
    ".sadl/cache/",
    ".sadl/locks/"
  ];
  const missing = additions.filter((line) => !existing.includes(line));
  if (missing.length > 0) {
    fs.appendFileSync(gitignorePath, `\n# SADL secret and local state safety\n${missing.join("\n")}\n`, "utf8");
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

function hashText(value) {
  const hash = crypto.createHash("sha256");
  hash.update(String(value));
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

function splitLines(value) {
  if (!value) return [];
  return String(value)
    .split(/[;\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSecretNames(values) {
  return splitLines(Array.isArray(values) ? values.join(",") : values)
    .map((value) => value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))
    .filter(Boolean);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "task";
}

function deepMerge(base, override) {
  const outputValue = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (Array.isArray(value)) {
      outputValue[key] = Array.from(new Set([...(outputValue[key] || []), ...value]));
    } else if (value && typeof value === "object") {
      outputValue[key] = deepMerge(outputValue[key] || {}, value);
    } else {
      outputValue[key] = value;
    }
  }
  return outputValue;
}

function renderKeyValueList(entries) {
  if (!entries || entries.length === 0) return "<p>None.</p>";
  return `<ul>${entries.map(([key, value]) => `<li><code>${escapeHtml(key)}</code>: ${escapeHtml(String(value))}</li>`).join("")}</ul>`;
}

function renderCountList(entries) {
  if (!entries || entries.length === 0) return "<p>None.</p>";
  return `<ul>${entries.map(([key, value]) => `<li><code>${escapeHtml(key)}</code>: ${escapeHtml(String(value))}</li>`).join("")}</ul>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function formatCountMap(entries, options = {}) {
  const repeated = entries
    .filter(([, count]) => options.includeSingles || count > 1)
    .slice(0, 10);
  if (repeated.length === 0) return "- No repeated items detected.";
  return repeated.map(([value, count]) => `- ${value}: ${count}`).join("\n");
}

function buildDreamSuggestions(commandCounts, blockerCounts, failedTasks, metrics = {}) {
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
  if (metrics.approvalCount > 0 || metrics.waitingMinutes > 0) {
    suggestions.push("- Review approval gates and document which actions can proceed read-only while waiting.");
  }
  if ((metrics.statusCounts || []).some(([status, count]) => status === "FAILED_TESTS" && count > 1)) {
    suggestions.push("- Add a test-failure BKM or tighten validation commands for recurring failed tests.");
  }
  suggestions.push("- Human review required before changing AGENTS.md, .sadl/config.json, or docs/04_ARCH_SPEC.md.");
  return suggestions.join("\n");
}

module.exports = {
  main,
  collectValidation
};
