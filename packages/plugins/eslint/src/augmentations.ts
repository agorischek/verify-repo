import "@verify-repo/engine";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    eslint: import("./types").EslintPluginApi;
  }
}
