import "@verify-repo/engine";
import type { PrettierPluginApi } from "./types";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    prettier: PrettierPluginApi;
  }
}

