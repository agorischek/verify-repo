import {
  RepoTesterBase,
  RepoTestsConfig,
  RepoPlugin,
  PluginContext,
} from "@repo-tests/core";
import { file } from "@repo-tests/plugin-file";
import { script } from "@repo-tests/plugin-script";
import { prettier } from "@repo-tests/plugin-prettier";
import { git } from "@repo-tests/plugin-git";
import { RepoTesterConfig } from "./RepoTesterConfig";

export class RepoTester extends RepoTesterBase {
  private _plugins: RepoPlugin[];
  private _test: any;
  private _expect: any;

  constructor(config: RepoTesterConfig) {
    const { plugins = [], test, expect, ...rest } = config;

    // Combine built-in plugins with additional plugins
    const allPlugins: RepoPlugin[] = [
      file(),
      script(),
      prettier(),
      git(),
      ...plugins,
    ];

    const repoTestsConfig: RepoTestsConfig = {
      ...rest,
      plugins: allPlugins,
      test,
      expect,
    };

    super(repoTestsConfig);
    this._plugins = allPlugins;
    this._test = test;
    this._expect = expect;
  }

  /**
   * Extend this RepoTester instance with additional plugins.
   * This mutates the instance in place by adding new methods from the plugins.
   */
  extend(...plugins: RepoPlugin[]): this {
    this._plugins.push(...plugins);

    // Apply new plugins to this instance
    const context: PluginContext = {
      test: this._test,
      expect: this._expect,
      root: this.root,
    };

    for (const plugin of plugins) {
      const api = plugin(context) || {};
      Object.assign(this, api);
    }

    return this;
  }
}
