import "@verify-repo/engine";

// Module augmentation to add 'prettier' to RepoVerification
declare module "@verify-repo/engine" {
  interface RepoVerification {
    prettier: import("./types").PrettierPluginApi;
  }
}
