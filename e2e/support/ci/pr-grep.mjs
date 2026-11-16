#!/usr/bin/env node
// Which tests a pull request runs: every @smoke test, plus every test of a
// spec file the pull request added or changed.
//
//   git diff --name-only --diff-filter=d <base> <head> | node e2e/support/ci/pr-grep.mjs
//
// Reads repository-relative paths, one per line, and prints one regular
// expression for `playwright test --grep`. Playwright matches --grep
// against the project name, the spec's path below e2e/, the titles and the
// tags, joined by spaces, so a path selects a whole file.
//
// A changed spec whose tests are tagged @unverified still does not run: the
// config leaves that tag out (see "Unverified specs" in e2e/README.md).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const E2E_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPEC = /^e2e\/(features\/.+\.spec\.ts)$/;

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const changed = fs
  .readFileSync(0, "utf8")
  .split("\n")
  .map((line) => line.trim().replaceAll("\\", "/"))
  .map((line) => SPEC.exec(line)?.[1])
  // A deleted or renamed-away file has no tests to run.
  .filter((file) => file && fs.existsSync(path.join(E2E_DIR, file)));

console.log(["@smoke", ...[...new Set(changed)].sort().map(escape)].join("|"));
