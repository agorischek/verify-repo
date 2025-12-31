import { RepoVerificationFailedError } from "./errors";
import { printDocs } from "./docs";
import { run } from "./run";

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--docs") || args.includes("-d")) {
    await Promise.resolve(printDocs());
    return;
  }

  const verbose = args.includes("--verbose") || args.includes("-v");

  await run({ verbose });
}

main().catch((error) => {
  if (error instanceof RepoVerificationFailedError) {
    // Don't print error message - reporter already showed failures
    // Only print in verbose mode (but we don't have access to verbose flag here)
    // So we'll just suppress it since reporter handles it
  } else if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
