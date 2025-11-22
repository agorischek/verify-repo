import { RepoPlugin } from "@repo-tests/core";

export interface RepoTesterConfig {
  root?: string;
  plugins?: RepoPlugin[];
  concurrency?: number;
}
