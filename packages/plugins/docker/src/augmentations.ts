declare module "@verify-repo/engine" {
  interface RepoVerification {
    docker: import("./types").DockerPluginApi;
  }
}
