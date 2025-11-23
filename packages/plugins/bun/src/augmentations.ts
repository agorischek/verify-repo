import "@verify-repo/engine";
import type { BunPluginApi } from "./types";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    bun: BunPluginApi;
  }
}
