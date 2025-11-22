import "@verify-repo/engine";
import type { FilePluginApi } from "./types";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    file: (filePath: string) => FilePluginApi;
  }
}
