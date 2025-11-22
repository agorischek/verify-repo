import "@verify-repo/engine";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    ts: import("./types").TsPluginApi;
  }
}
