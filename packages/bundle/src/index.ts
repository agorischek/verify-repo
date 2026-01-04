// Set up the runtime factory before any other imports that might use verify
import { setRuntimeFactory } from "@verify-repo/cli";
import { RepoVerificationRuntime, createRuntime } from "./RepoVerificationRuntime";

// Configure CLI to use our runtime with built-in plugins
setRuntimeFactory(createRuntime);

// Re-export from engine
export * from "@verify-repo/engine";

// Re-export from CLI (this includes verify, run, configure, etc.)
export {
  // Core types and classes
  RepoVerificationRuntimeBase,
  type RepoVerifierConfig,
  RepoVerificationFailedError,
  // Verify proxy
  verify,
  configure,
  getVerifyInstance,
  normalizeRoot,
  type RepoVerifier,
  // Runner
  run,
  type RunOptions,
  // Documentation
  collectDocs as cliCollectDocs,
  printDocs as cliPrintDocs,
  type DocsOptions,
} from "@verify-repo/cli";

// Re-export plugins
export * from "packages/plugins/fs/src";
export * from "@verify-repo/plugin-command";
export * from "@verify-repo/plugin-prettier";
export * from "@verify-repo/plugin-git";
export * from "@verify-repo/plugin-ts";
export * from "@verify-repo/plugin-eslint";
export * from "@verify-repo/plugin-bun";
export * from "@verify-repo/plugin-docker";

// Bundle-specific exports
export { RepoVerificationRuntime, createRuntime };

// Override docs functions to include built-in plugins
import { collectDocs, printDocs } from "./docs";
export { collectDocs, printDocs };

// Default export
import { verify } from "@verify-repo/cli";
export default verify;
