import "@verify-repo/engine";
import type { TsPluginApi } from "./types";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    ts: TsPluginApi;
  }
}
