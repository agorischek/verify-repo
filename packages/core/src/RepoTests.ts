import { RepoTestsConfig, RepoTestsExtensions, PluginContext } from './types';

// Use declaration merging to mixin the extensions
export interface RepoTests extends RepoTestsExtensions {}

export class RepoTests {
  // We use 'any' for the index signature to allow dynamic assignment in the constructor,
  // but the interface declaration merging above provides the specific types for consumers.
  [key: string]: any;

  public readonly rootDir?: string;

  constructor(config: RepoTestsConfig) {
    const { plugins, test, expect, root: rootDir } = config;
    
    if (!test || !expect) {
      throw new Error("RepoTests requires 'test' and 'expect' to be passed in the config.");
    }

    this.rootDir = rootDir;

    for (const plugin of plugins) {
      const context: PluginContext = { test, expect, root: rootDir };
      this[plugin.name] = plugin.create(context);
    }
  }
}
