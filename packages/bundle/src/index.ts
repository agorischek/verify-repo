// Export core functionality
export * from "@repo-tests/core";

// Export plugins
export * from "@repo-tests/plugin-file";
export * from "@repo-tests/plugin-script";
export * from "@repo-tests/plugin-prettier";
export * from "@repo-tests/plugin-git";

import { RepoTester } from "./RepoTester";
export { RepoTester };
export type { RepoTesterConfig } from "./RepoTesterConfig";
export { run } from "./run";
export { RepoTestsFailedError } from "./errors";

// Import and re-export verify to ensure tsdown can resolve it
import { verify, configure, type Verify } from "./verify";
export { verify, configure };
export type { Verify };

export default verify;
