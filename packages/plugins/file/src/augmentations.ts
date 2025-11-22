// Module augmentation to add 'file' to RepoVerification
declare module "verify-repo" {
  interface RepoVerification {
    file: (filePath: string) => import("./types").FilePluginApi;
  }
}
