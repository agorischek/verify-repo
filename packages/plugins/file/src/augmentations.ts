import "@verify-repo/engine";

// Module augmentation to add 'file' to RepoVerification
declare module "@verify-repo/engine" {
  interface RepoVerification {
    file: (filePath: string) => import("./types").FilePluginApi;
  }
}
