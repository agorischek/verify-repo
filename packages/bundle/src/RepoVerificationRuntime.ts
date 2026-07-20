import { RepoVerificationRuntimeBase, type RepoVerifierConfig } from "@verify-repo/cli";
import type { RepoPlugin } from "@verify-repo/engine";
import { fs } from "packages/plugins/fs/src";
import { command } from "@verify-repo/plugin-command";
import { prettier } from "@verify-repo/plugin-prettier";
import { git } from "@verify-repo/plugin-git";
import { ts as tsPlugin } from "@verify-repo/plugin-ts";
import { eslint as eslintPlugin } from "@verify-repo/plugin-eslint";
import { bun as bunPlugin } from "@verify-repo/plugin-bun";
import { docker } from "@verify-repo/plugin-docker";
import { pkg } from "@verify-repo/plugin-package";

const builtInPlugins: RepoPlugin[] = [
  fs(),
  command(),
  prettier(),
  git(),
  tsPlugin(),
  eslintPlugin(),
  bunPlugin(),
  docker(),
  pkg(),
];

export class RepoVerificationRuntime extends RepoVerificationRuntimeBase {
  constructor(config: RepoVerifierConfig = {}) {
    const { plugins = [], ...rest } = config;
    super({
      ...rest,
      plugins: [...builtInPlugins, ...plugins],
    });
  }
}

/**
 * Factory function for creating runtime instances with built-in plugins.
 */
export function createRuntime(config?: RepoVerifierConfig): RepoVerificationRuntime {
  return new RepoVerificationRuntime(config);
}
