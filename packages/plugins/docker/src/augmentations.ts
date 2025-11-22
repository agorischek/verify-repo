declare module "verify-repo" {
  interface RepoVerification {
    docker: import("./types").DockerPluginApi;
  }
}
