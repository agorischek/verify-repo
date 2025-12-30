import "@verify-repo/engine";
import type { DirPluginApi, FilePluginApi, FilesPluginApi } from "./types";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    file: (filePath: string) => FilePluginApi;
    files: (pattern: RegExp) => FilesPluginApi;
    dir: (dirPath: string) => DirPluginApi;
  }
}
