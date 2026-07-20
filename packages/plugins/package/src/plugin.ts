import { type RepoPlugin, type VerificationContext } from "@verify-repo/engine";
import type { PackageDependenciesApi, PackagePluginApi } from "./types";
import { collectDeclaredDependencies, loadPackageJsonForTarget } from "./resolution";

type PackageLeaf = PackagePluginApi;
type PackageRoot = (nameOrPath: string) => PackageLeaf;
type PackageEntrypoint = PackageRoot | PackageLeaf;

export const pkg = (): RepoPlugin => ({
  name: "Package",
  description: "Assertions for package.json metadata and workspace dependencies.",
  docs: [
    {
      signature: 'verify.package("<nameOrPath>").dependencies.includes("<dep>")',
      description:
        "Resolves a package by workspace name or relative path (dir or package.json) and passes when the dependency is declared.",
    },
    {
      signature: 'verify.package("<nameOrPath>").dependencies.notIncludes("<dep>")',
      description:
        "Resolves a package by workspace name or relative path (dir or package.json) and passes when the dependency is not declared.",
    },
  ],
  api() {
    const buildEntry = (context: VerificationContext, nameOrPath?: string): PackageEntrypoint => {
      if (nameOrPath) {
        const entry = context.entry({}) as unknown as PackageLeaf & Record<string, unknown>;
        entry.dependencies = context.entry({
          includes: (dependencyName: string) => scheduleDependencyCheck(context, nameOrPath, dependencyName, true),
          notIncludes: (dependencyName: string) => scheduleDependencyCheck(context, nameOrPath, dependencyName, false),
        }) as unknown as PackageDependenciesApi;
        return entry as unknown as PackageLeaf;
      }

      return context.entry(
        {},
        (parent: VerificationContext, target: string) =>
          buildEntry(parent.extend({ package: target }), target) as unknown as PackageLeaf,
      ) as unknown as PackageRoot;
    };

    return {
      package(context: VerificationContext) {
        return buildEntry(context);
      },
    };
  },
});

// Alias with a clearer name for external consumers.
export const packagePlugin = pkg;

function scheduleDependencyCheck(
  context: VerificationContext,
  nameOrPath: string,
  dependencyName: string,
  expectedToInclude: boolean,
) {
  const description = expectedToInclude
    ? `Package "${nameOrPath}" should include dependency "${dependencyName}"`
    : `Package "${nameOrPath}" should not include dependency "${dependencyName}"`;

  context.register(description, async () => {
    try {
      const { packageJsonPath: pkgJsonPath, packageJson: pkgJson } = await loadPackageJsonForTarget(
        context.dir,
        nameOrPath,
      );
      const declaredDeps = collectDeclaredDependencies(pkgJson);
      const has = declaredDeps.has(dependencyName);

      if (expectedToInclude) {
        return has
          ? { pass: true, message: `Package "${nameOrPath}" declares "${dependencyName}".` }
          : {
              pass: false,
              message: `Expected package "${nameOrPath}" to declare "${dependencyName}", but it does not. (package.json: ${pkgJsonPath})`,
            };
      }

      return !has
        ? { pass: true, message: `Package "${nameOrPath}" does not declare "${dependencyName}".` }
        : {
            pass: false,
            message: `Expected package "${nameOrPath}" to not declare "${dependencyName}", but it does. (package.json: ${pkgJsonPath})`,
          };
    } catch (error) {
      return {
        pass: false,
        message: `Failed to inspect dependencies for "${nameOrPath}".`,
        error,
      };
    }
  });
}
