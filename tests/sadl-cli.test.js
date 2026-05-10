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

  let result = run(["init", project]);
  assertOk(result, "init");
  assert(fs.existsSync(path.join(project, "AGENTS.md")), "AGENTS.md should exist");
  assert(fs.existsSync(path.join(project, "docs", "01_PRD.md")), "PRD should exist");
  assert(fs.existsSync(path.join(project, ".sadl_manifest.json")), "manifest should exist");

  result = spawnSync(process.execPath, [createCli, createdProject], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assertOk(result, "create-sadl-project");
  assert(fs.existsSync(path.join(createdProject, "AGENTS.md")), "create wrapper should init project");

  result = run(["validate", project]);
  assertOk(result, "validate");
  assert.match(result.stdout, /SADL validation/, "validate should print validation summary");

  result = run(["validate", project, "--strict"]);
  assert.notStrictEqual(result.status, 0, "strict validation should fail while placeholders remain");
  assert.match(result.stdout, /USER ACTION REQUIRED/, "strict validation should mention placeholders");

  result = run([
    "checkpoint",
    project,
    "--task",
    "0.1 Complete PRD",
    "--status",
    "DONE",
    "--model",
    "test-model",
    "--commands",
    "sadl validate",
    "--validation",
    "template validation passed",
    "--next",
    "Fill architecture spec"
  ]);
  assertOk(result, "checkpoint");
  const state = fs.readFileSync(path.join(project, "docs", "03_STATE.md"), "utf8");
  assert.match(state, /Task Status: DONE - 0.1 Complete PRD/, "checkpoint should update state");

  const logs = fs.readdirSync(path.join(project, "docs", "session_logs")).filter((file) => file.endsWith(".json"));
  assert.strictEqual(logs.length, 1, "checkpoint should write one JSON log");

  result = run(["dream", project]);
  assertOk(result, "dream");
  assert(fs.existsSync(path.join(project, "docs", "dreams")), "dreams directory should exist");

  result = run(["status", project, "--json"]);
  assertOk(result, "status json");
  const status = JSON.parse(result.stdout);
  assert.strictEqual(status.project, project, "status should include project path");

  console.log("sadl-cli tests passed");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
