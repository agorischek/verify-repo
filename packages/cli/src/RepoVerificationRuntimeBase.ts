import { RepoVerificationEngine, RepoPlugin } from "@verify-repo/engine";
import { RepoVerifierConfig } from "./RepoVerifierConfig";

/**
 * Base runtime class that can be extended with plugins.
 * This class doesn't include any built-in plugins - those are added by the bundle.
 */
export class RepoVerificationRuntimeBase extends RepoVerificationEngine {
  private readonly _plugins: RepoPlugin[];

  constructor(config: RepoVerifierConfig = {}) {
    const { plugins = [], root, concurrency, packageManager = "npm" } = config;

    // Convert boolean concurrency to number: true = unlimited (Infinity), false = sequential (1)
    const defaultConcurrency: number | undefined =
      typeof concurrency === "boolean" ? (concurrency ? Number.POSITIVE_INFINITY : 1) : concurrency;

    super({
      plugins,
      root,
      defaultConcurrency,
      packageManager,
    });

    this._plugins = [...plugins];
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
