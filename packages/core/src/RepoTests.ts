import { RepoTestsConfig, RepoTestsExtensions, PluginContext } from "./types";

// Use declaration merging to mixin the extensions
export interface RepoTesterBase extends RepoTestsExtensions {}

export class RepoTesterBase {
  // We use 'any' for the index signature to allow dynamic assignment in the constructor,
  // but the interface declaration merging above provides the specific types for consumers.
  [key: string]: any;

  public readonly root?: string;

  constructor(config: RepoTestsConfig) {
    const { plugins, test, expect, root } = config;

    if (!test || !expect) {
      throw new Error(
        "RepoTesterBase requires 'test' and 'expect' to be passed in the config.",
      );
    }

    this.root = root;

    for (const plugin of plugins) {
      const context: PluginContext = { test, expect, root };
      const api = plugin(context) || {};
      Object.assign(this, api);
    }
  }
}
