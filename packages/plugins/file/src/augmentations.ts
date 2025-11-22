// Module augmentation to add 'file' to RepoTests
declare module "repo-tests" {
  interface RepoTestsExtensions {
    file: (filePath: string) => import("./types").FilePluginApi;
  }
}
