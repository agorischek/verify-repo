import "@verify-repo/engine";
import type { DirPluginApi, FilePluginApi, FilesPluginApi, GlobPattern } from "./types";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    file: (filePath: string) => FilePluginApi;
    files: (pattern: GlobPattern) => FilesPluginApi;
    dir: (dirPath: string) => DirPluginApi;
  }
}
