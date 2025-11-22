// Module augmentation to add 'prettier' to RepoTests
declare module "repo-tests" {
  interface RepoTestsExtensions {
    prettier: import("./types").PrettierPluginApi;
  }
}
