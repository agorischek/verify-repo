import * as fs from "fs/promises";
import * as path from "path";
import type { RepoTests } from "../core";

export function createPrettierIntegration(repo: RepoTests) {
  const repoRoot = repo.getRepoRoot();

  const prettierIntegration = function () {
    repo.register("prettier: repo formatted", async () => {
      const { default: prettier } = await import("prettier");
      const { glob } = await import("glob");

      const config = await prettier.resolveConfig(repoRoot);
      const files = await glob("**/*.{js,jsx,ts,tsx,json,css,md}", {
        cwd: repoRoot,
        ignore: ["node_modules/**", "dist/**", "build/**"],
      });

      for (const file of files) {
        const filePath = path.join(repoRoot, file);
        const content = await fs.readFile(filePath, "utf8");
        const formatted = await prettier.format(content, {
          ...config,
          filepath: filePath,
        });

        if (content !== formatted) {
          throw new Error(`File ${file} is not formatted correctly`);
        }
      }
    });
  };

  const callable: any = prettierIntegration;

  callable.formats = prettierIntegration;

  callable.file = function (filePath: string) {
    return {
      isFormatted() {
        repo.register(`prettier: ${filePath} is formatted`, async () => {
          const { default: prettier } = await import("prettier");
          const fullPath = path.resolve(repoRoot, filePath);
          const content = await fs.readFile(fullPath, "utf8");
          const config = await prettier.resolveConfig(fullPath);
          const formatted = await prettier.format(content, {
            ...config,
            filepath: fullPath,
          });

          if (content !== formatted) {
            throw new Error(`File ${filePath} is not formatted correctly`);
          }
        });
      },
    };
  };

  return callable;
}
