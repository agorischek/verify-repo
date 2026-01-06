import "@verify-repo/engine";
import type { PackagePluginApi } from "./types";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    package: (nameOrPath: string) => PackagePluginApi;
  }
}
