import { RepoTesterBase, RepoPlugin } from "@repo-tests/core";
import { file } from "@repo-tests/plugin-file";
import { command } from "@repo-tests/plugin-command";
import { prettier } from "@repo-tests/plugin-prettier";
import { git } from "@repo-tests/plugin-git";
import { ts as tsPlugin } from "@repo-tests/plugin-ts";
import { eslint as eslintPlugin } from "@repo-tests/plugin-eslint";
import { docker } from "@repo-tests/plugin-docker";
import { RepoTesterConfig } from "./RepoTesterConfig";

export class RepoTester extends RepoTesterBase {
  private readonly _plugins: RepoPlugin[];

  constructor(config: RepoTesterConfig = {}) {
    const { plugins = [], root, concurrency } = config;

    const builtIns: RepoPlugin[] = [
      file(),
      command(),
      prettier(),
      git(),
      tsPlugin(),
      eslintPlugin(),
      docker(),
    ];
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
