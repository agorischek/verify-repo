// Module augmentation to add 'command' to RepoVerification
declare module "verify-repo" {
  interface RepoVerification {
    command: (command: string) => import("./types").CommandPluginApi;
  }
}
