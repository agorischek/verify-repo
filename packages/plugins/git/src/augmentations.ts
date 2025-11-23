import "@verify-repo/engine";
import type { GitPluginApi } from "./types";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    git: GitPluginApi;
  }
}

