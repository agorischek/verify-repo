// Core exports
export * from "@verify-repo/engine";

// CLI-specific exports
export { RepoVerificationRuntimeBase } from "./RepoVerificationRuntimeBase";
export type { RepoVerifierConfig } from "./RepoVerifierConfig";
export { RepoVerificationFailedError } from "./errors";

// Verify proxy and configuration
export { verify, configure, getVerifyInstance, normalizeRoot, setRuntimeFactory } from "./verify";
export type { RepoVerifier, RuntimeFactory } from "./verify";

// Runner
export { run } from "./run";
export type { RunOptions } from "./run";

// Documentation
export { collectDocs, printDocs } from "./docs";
export type { DocsOptions } from "./docs";

// Default export
import { verify } from "./verify";
export default verify;
