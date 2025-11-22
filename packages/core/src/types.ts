export interface PluginContext {
  test: any;
  expect: any;
  root?: string;
}

export type RepoPluginResult = Record<string, (...args: any[]) => any>;

export type RepoPlugin<T extends RepoPluginResult = RepoPluginResult> = (
  context: PluginContext
) => T;

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
 * declare module 'repo-tests' {
 *   interface RepoTestsExtensions {
 *     myPlugin: MyPluginApi;
 *   }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RepoTestsExtensions {}
