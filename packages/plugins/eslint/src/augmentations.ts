import "@verify-repo/engine";
import type { EslintPluginApi } from "./types";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    eslint: EslintPluginApi;
  }
}
