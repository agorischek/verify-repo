import { RepoTestsConfig, RepoTestsExtensions } from './types';

// Use declaration merging to mixin the extensions
export interface RepoTests extends RepoTestsExtensions {}

export class RepoTests {
  // We use 'any' for the index signature to allow dynamic assignment in the constructor,
  // but the interface declaration merging above provides the specific types for consumers.
  [key: string]: any;

  constructor(config: RepoTestsConfig) {
    const { plugins, test, expect } = config;
    
    if (!test || !expect) {
      throw new Error("RepoTests requires 'test' and 'expect' to be passed in the config.");
    }

    for (const plugin of plugins) {
      if (plugin.matchers) {
        expect.extend(plugin.matchers);
      }
      this[plugin.name] = plugin.create({ test, expect });
    }
  }
}
