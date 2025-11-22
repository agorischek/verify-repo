import { RepoPlugin } from "@repo-tests/core";

export interface RepoTesterConfig {
  test: any;
  expect: any;
  root?: string;
  plugins?: RepoPlugin[];
}
