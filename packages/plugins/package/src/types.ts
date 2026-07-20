export interface PackageDependenciesApi {
  /**
   * Passes when the target package declares the dependency (dependencies/devDependencies/peerDependencies/optionalDependencies).
   */
  includes: (dependencyName: string) => void;
  /**
   * Passes when the target package does not declare the dependency (dependencies/devDependencies/peerDependencies/optionalDependencies).
   */
  notIncludes: (dependencyName: string) => void;
}

export interface PackagePluginApi {
  dependencies: PackageDependenciesApi;
}
