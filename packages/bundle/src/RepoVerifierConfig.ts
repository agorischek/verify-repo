import { RepoPlugin } from "@verify-repo/engine";

export interface RepoVerifierConfig {
  root?: string;
  plugins?: RepoPlugin[];
  concurrency?: number;
}
