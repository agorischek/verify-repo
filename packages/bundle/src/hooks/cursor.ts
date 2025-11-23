#!/usr/bin/env bun

/**
 * Cursor hook script that runs verification and optionally sends a followup message.
 * Reads JSON input from stdin (for stop hook, contains: {"status": "...", "loop_count": 0}).
 * Outputs verification results to stderr and returns followup message or empty JSON.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Read JSON input from stdin (hook event data)
// For stop hook, this contains: {"status": "...", "loop_count": 0}
let inputData = "";
for await (const chunk of process.stdin) {
  inputData += chunk.toString();
}

// Parse JSON and extract loop_count
let loopCount = 0;
try {
  const input = JSON.parse(inputData);
  loopCount = typeof input.loop_count === "number" ? input.loop_count : 0;
} catch {
  // If parsing fails, default to 0
  loopCount = 0;
}

// Change to project root (from packages/bundle/src/hooks/cursor.ts)
// Script is at: packages/bundle/src/hooks/cursor.ts
// Need to go up 4 levels: hooks -> src -> bundle -> packages -> root
const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = dirname(scriptPath);
const projectRoot = resolve(scriptDir, "../../../..");
const verifyScriptPath = resolve(projectRoot, "packages/bundle/src/bin.ts");
process.chdir(projectRoot);

// Run bun verify command directly (using absolute path to avoid PATH issues)
// This avoids PATH/environment issues when running as a hook
const verifyProcess = spawn("bun", [verifyScriptPath], {
  cwd: projectRoot,
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";

verifyProcess.stdout.on("data", (data) => {
  stdout += data.toString();
});

verifyProcess.stderr.on("data", (data) => {
  stderr += data.toString();
});

const verifyExitCode = await new Promise<number>((resolve) => {
  verifyProcess.on("close", (code) => {
    resolve(code ?? 0);
  });
});

const verifyOutput = stdout + stderr;

// Only send followup if verification actually failed and we haven't exceeded max loops
if (verifyExitCode !== 0 && loopCount < 5) {
  // Output verification results to stderr so they're visible in hooks output (only on failure)
  process.stderr.write(verifyOutput);

  // Output followup message to automatically continue and fix issues
  console.log(
    JSON.stringify({
      followup_message: "Run 'bun verify' and fix issues.",
    }),
  );
  process.exit(0);
} else {
  // Verification passed (exit code 0) or max loops reached - no followup, no output
  // Output empty JSON to stdout to indicate no action needed
  // Exit immediately to prevent any further processing
  console.log("{}");
  process.exit(0);
}
