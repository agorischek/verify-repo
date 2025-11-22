import "@verify-repo/engine";

// Module augmentation to add 'command' to RepoVerification
declare module "@verify-repo/engine" {
  interface RepoVerification {
    command: (command: string) => import("./types").CommandPluginApi;
  }
}
