declare module "repo-tests" {
  interface RepoTestsExtensions {
    ts: import("./types").TsPluginApi;
  }
}
