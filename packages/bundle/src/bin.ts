#!/usr/bin/env node
const cliStartTime = performance.now();

import { run as runCli } from "@drizzle-team/brocli";
import { RepoVerificationFailedError, run, printDocs } from "./index";
import { command, boolean } from "@drizzle-team/brocli";

const runCommand = command({
  name: "run",
  desc: "Run repository verification checks",
  options: {
    verbose: boolean().desc("Enable verbose output"),
  },
  handler: async (options) => {
    await run({ verbose: options.verbose, startTime: cliStartTime });
  },
});

const docsCommand = command({
  name: "docs",
  desc: "Print available plugin APIs",
  options: {
    json: boolean().desc("Output documentation as JSON"),
  },
  handler: async () => {
    await printDocs();
  },
});

runCli([runCommand, docsCommand], {
  name: "verify-repo",
  version: "0.0.1",
}).catch((error) => {
  if (error instanceof RepoVerificationFailedError) {
    // Don't print error message - reporter already showed failures
  } else if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
