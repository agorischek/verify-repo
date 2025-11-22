// Export core functionality
export * from '@repo-tests/core';

// Export plugins
export * from '@repo-tests/plugin-file';
export * from '@repo-tests/plugin-script';

import { RepoTester } from './RepoTester';
export { RepoTester };
export type { RepoTesterConfig } from './RepoTesterConfig';
export { create } from './create';

// Import and re-export verify to ensure tsdown can resolve it
import { verify, type Verify } from './verify';
export { verify };
export type { Verify };

export default verify;


