import "@verify-repo/engine";

// Module augmentation to add 'git' to RepoVerification
declare module "@verify-repo/engine" {
  interface RepoVerification {
    git: import("./types").GitPluginApi;
  }
}
