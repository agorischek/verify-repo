#!/usr/bin/env node

import { RepoVerificationFailedError } from "./errors";
import { printDocs } from "./docs";
import { run } from "./run";

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--docs") || args.includes("-d")) {
    await Promise.resolve(printDocs());
    return;
  }

  await run();
}

main().catch((error) => {
  if (error instanceof RepoVerificationFailedError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
