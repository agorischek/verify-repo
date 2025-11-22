// Module augmentation to add 'prettier' to RepoVerification
declare module "verify-repo" {
  interface RepoVerification {
    prettier: import("./types").PrettierPluginApi;
  }
}
