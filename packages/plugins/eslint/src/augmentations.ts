declare module "repo-tests" {
  interface RepoTestsExtensions {
    eslint: import("./types").EslintPluginApi;
  }
}
