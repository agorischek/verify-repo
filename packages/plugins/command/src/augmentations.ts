// Module augmentation to add 'command' to RepoTests
declare module "repo-tests" {
  interface RepoTestsExtensions {
    command: (command: string) => import("./types").CommandPluginApi;
  }
}
