// Module augmentation to add 'git' to RepoVerification
declare module "verify-repo" {
  interface RepoVerification {
    git: import("./types").GitPluginApi;
  }
}
