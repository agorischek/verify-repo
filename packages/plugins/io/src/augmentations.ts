import "@verify-repo/engine";
import type { FilePluginApi, DirPluginApi } from "./types";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    file: (filePath: string) => FilePluginApi;
    dir: (dirPath: string) => DirPluginApi;
  }
}

