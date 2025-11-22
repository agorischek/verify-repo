import { RepoTesterBase, RepoPlugin } from "@repo-tests/core";
import { file } from "@repo-tests/plugin-file";
import { script } from "@repo-tests/plugin-script";
import { prettier } from "@repo-tests/plugin-prettier";
import { git } from "@repo-tests/plugin-git";
import { RepoTesterConfig } from "./RepoTesterConfig";

export class RepoTester extends RepoTesterBase {
  private readonly _plugins: RepoPlugin[];

  constructor(config: RepoTesterConfig = {}) {
    const { plugins = [], root, concurrency } = config;

    const builtIns: RepoPlugin[] = [file(), script(), prettier(), git()];
    const allPlugins = [...builtIns, ...plugins];

    super({
      plugins: allPlugins,
      root,
      defaultConcurrency: concurrency,
    });

    this._plugins = allPlugins;
  }

  /**
   * Extend this RepoTester instance with additional plugins.
   * This mutates the instance in place by adding new methods from the plugins.
   */
  extend(...plugins: RepoPlugin[]): this {
    for (const plugin of plugins) {
      this._plugins.push(plugin);
      this.applyPlugin(plugin);
    }
    return this;
  }

  get plugins(): readonly RepoPlugin[] {
    return this._plugins;
  }
}
