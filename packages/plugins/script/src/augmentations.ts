// Module augmentation to add 'script' to RepoTests
declare module "repo-tests" {
  interface RepoTestsExtensions {
    script: (name: string) => import("./types").ScriptPluginApi;
  }
}
