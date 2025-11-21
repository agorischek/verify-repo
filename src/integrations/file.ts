import * as fs from "fs/promises";
import * as path from "path";
import type { RepoTests } from "../core";

export function createFileIntegration(repo: RepoTests) {
  const repoRoot = repo.getRepoRoot();

  const fileIntegration = function (filePath: string) {
    return {
      exists() {
        repo.register(`file: ${filePath} exists`, async () => {
          const fullPath = path.resolve(repoRoot, filePath);
          try {
            const stat = await fs.stat(fullPath);
            if (!stat.isFile()) {
              throw new Error(`Path ${filePath} exists but is not a file`);
            }
          } catch (error: any) {
            if (error.code === "ENOENT") {
              throw new Error(`File ${filePath} does not exist`);
            }
            throw error;
          }
        });
      },

      doesNotExist() {
        repo.register(`file: ${filePath} does not exist`, async () => {
          const fullPath = path.resolve(repoRoot, filePath);
          try {
            await fs.access(fullPath);
            throw new Error(`File ${filePath} exists but should not`);
          } catch (error: any) {
            if (error.code !== "ENOENT") {
              throw error;
            }
            // File doesn't exist, which is what we want
          }
        });
      },

      contains(substring: string) {
        repo.register(`file: ${filePath} contains ${substring}`, async () => {
          const fullPath = path.resolve(repoRoot, filePath);
          const content = await fs.readFile(fullPath, "utf8");
          expect(content).toContainSubstring(substring);
        });
      },

      matches(regex: RegExp) {
        repo.register(`file: ${filePath} matches ${regex}`, async () => {
          const fullPath = path.resolve(repoRoot, filePath);
          const content = await fs.readFile(fullPath, "utf8");
          if (!regex.test(content)) {
            throw new Error(`File ${filePath} does not match pattern ${regex}`);
          }
        });
      },

      json() {
        return {
          hasKey(keyPath: string) {
            repo.register(`file: ${filePath} json has key ${keyPath}`, async () => {
              const fullPath = path.resolve(repoRoot, filePath);
              const content = await fs.readFile(fullPath, "utf8");
              const json = JSON.parse(content);
              const keys = keyPath.split(".");
              let current: any = json;
              for (const key of keys) {
                if (current[key] === undefined) {
                  throw new Error(`JSON key path "${keyPath}" not found in ${filePath}`);
                }
                current = current[key];
              }
            });
          },
        };
      },
    };
  };

  return fileIntegration;
}
