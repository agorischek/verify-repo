import { RepoVerificationEngine, RepoPlugin } from "@verify-repo/engine";
import { file } from "@verify-repo/plugin-file";
import { command } from "@verify-repo/plugin-command";
import { prettier } from "@verify-repo/plugin-prettier";
import { git } from "@verify-repo/plugin-git";
import { ts as tsPlugin } from "@verify-repo/plugin-ts";
import { eslint as eslintPlugin } from "@verify-repo/plugin-eslint";
import { docker } from "@verify-repo/plugin-docker";
import { RepoVerifierConfig } from "./RepoVerifierConfig";

export class RepoVerificationRuntime extends RepoVerificationEngine {
  private readonly _plugins: RepoPlugin[];

  constructor(config: RepoVerifierConfig = {}) {
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
   * Extend this runtime instance with additional plugins.
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
