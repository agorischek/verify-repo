import "@verify-repo/engine";
import type { CommandPluginApi } from "./types";

// Module augmentation to add 'command' and 'script' to RepoVerification
declare module "@verify-repo/engine" {
  interface RepoVerification {
    command: (command: string) => CommandPluginApi;
    script: (script: string) => CommandPluginApi;
  }
}
