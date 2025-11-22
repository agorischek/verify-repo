declare module "repo-tests" {
  interface RepoTestsExtensions {
    docker: import("./types").DockerPluginApi;
  }
}
