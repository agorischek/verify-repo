// Export core functionality
export * from '@repo-tests/core';

// Export plugins
export * from '@repo-tests/plugin-file';
export * from '@repo-tests/plugin-script';

// Export RepoTester as the main export (both default and named)
export { RepoTester } from './RepoTester';
export type { RepoTesterConfig } from './RepoTesterConfig';

// Default export
export { RepoTester as default } from './RepoTester';

