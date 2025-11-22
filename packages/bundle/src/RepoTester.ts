import { RepoTesterBase, RepoTestsConfig, RepoPlugin } from '@repo-tests/core';
import { file } from '@repo-tests/plugin-file';
import { script } from '@repo-tests/plugin-script';
import { RepoTesterConfig } from './RepoTesterConfig';

export class RepoTester extends RepoTesterBase {
  constructor(config: RepoTesterConfig) {
    const { plugins = [], ...rest } = config;
    
    // Combine built-in plugins with additional plugins
    const allPlugins: RepoPlugin[] = [
      file(),
      script(),
      ...plugins,
    ];

    const repoTestsConfig: RepoTestsConfig = {
      ...rest,
      plugins: allPlugins,
    };

    super(repoTestsConfig);
  }
}

