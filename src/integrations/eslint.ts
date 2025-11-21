import type { RepoTests } from "../core";

export function createESLintIntegration(repo: RepoTests) {
  const repoRoot = repo.getRepoRoot();

  const eslintIntegration = function () {
    repo.register("eslint: project passes", async () => {
      // Dynamic import to avoid requiring eslint as a hard dependency
      const { ESLint } = await import("eslint");
      const eslint = new ESLint({ cwd: repoRoot });
      const results = await eslint.lintFiles(["."]);
      expect(results).toHaveNoEslintErrors();
    });
  };

  // Make it callable with properties
  const callable: any = eslintIntegration;

  callable.passes = eslintIntegration;

  callable.file = function (filePath: string) {
    return {
      hasNoErrors() {
        repo.register(`eslint: ${filePath} has no errors`, async () => {
          const { ESLint } = await import("eslint");
          const eslint = new ESLint({ cwd: repoRoot });
          const results = await eslint.lintFiles([filePath]);
          expect(results).toHaveNoEslintErrors();
        });
      },
    };
  };

  callable.files = function (globPattern: string) {
    return {
      hasNoErrors() {
        repo.register(`eslint: ${globPattern} has no errors`, async () => {
          const { ESLint } = await import("eslint");
          const eslint = new ESLint({ cwd: repoRoot });
          const results = await eslint.lintFiles([globPattern]);
          expect(results).toHaveNoEslintErrors();
        });
      },
    };
  };

  return callable;
}
