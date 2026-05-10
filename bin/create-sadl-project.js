#!/usr/bin/env node
"use strict";

const { main } = require("../src/cli");

const args = process.argv.slice(2);
const delegatedArgs = args.includes("--help") || args.includes("-h") ? ["help"] : ["init", ...args];

main(delegatedArgs).catch((error) => {
  console.error(`create-sadl-project: ${error.message}`);
  process.exitCode = 1;
});
