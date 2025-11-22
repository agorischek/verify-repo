// Module augmentation to add 'git' to RepoTests
declare module "repo-tests" {
  interface RepoTestsExtensions {
    git: import("./types").GitPluginApi;
  }
}
