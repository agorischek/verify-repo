// Export core functionality
export * from "@verify-repo/engine";

// Export plugins
export * from "@verify-repo/plugin-file";
export * from "@verify-repo/plugin-command";
export * from "@verify-repo/plugin-prettier";
export * from "@verify-repo/plugin-git";
export * from "@verify-repo/plugin-ts";
export * from "@verify-repo/plugin-eslint";
export * from "@verify-repo/plugin-docker";

import { RepoVerificationRuntime } from "./RepoVerificationRuntime";
export { RepoVerificationRuntime };
export type { RepoVerifierConfig } from "./RepoVerifierConfig";
export { run } from "./run";
export { RepoVerificationFailedError } from "./errors";

// Import and re-export verify to ensure tsdown can resolve it
import { verify, configure, type RepoVerifier } from "./verify";
export { verify, configure };
export type { RepoVerifier };

export default verify;
