declare module "verify-repo" {
  interface RepoVerification {
    eslint: import("./types").EslintPluginApi;
  }
}
