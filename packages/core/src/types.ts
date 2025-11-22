export interface RepoPlugin {
  name: string;
  create: (context: { test: any; expect: any }) => any;
  matchers?: Record<string, any>;
}

export interface RepoTestsConfig {
  plugins: RepoPlugin[];
  test: any;
  expect: any;
}

/**
 * This interface is intended to be augmented by plugins.
 * Plugins should add their property definitions here.
 * 
 * Example:
 * declare module '@repo-tests/core' {
 *   interface RepoTestsPlugins {
 *     myPlugin: MyPluginApi;
 *   }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RepoTestsExtensions {}
