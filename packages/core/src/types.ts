export interface PluginContext {
  test: any;
  expect: any;
  root?: string;
}

export interface RepoPlugin {
  name: string;
  create: (context: PluginContext) => any;
  matchers?: Record<string, any>;
}

export interface RepoTestsConfig {
  plugins: RepoPlugin[];
  test: any;
  expect: any;
  root?: string;
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
