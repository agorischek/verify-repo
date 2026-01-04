import { run as runCli } from "@drizzle-team/brocli";
import { RepoVerificationFailedError } from "./errors";
import { runCommand } from "./commands/run";
import { docsCommand } from "./commands/docs";

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
