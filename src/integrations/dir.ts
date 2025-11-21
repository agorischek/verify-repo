import * as fs from "fs/promises";
import * as path from "path";
import type { RepoTests } from "../core";

export function createDirIntegration(repo: RepoTests) {
  const repoRoot = repo.getRepoRoot();

  const dirIntegration = function (dirPath: string) {
    return {
      exists() {
        repo.register(`dir: ${dirPath} exists`, async () => {
          const fullPath = path.resolve(repoRoot, dirPath);
          try {
            const stat = await fs.stat(fullPath);
            if (!stat.isDirectory()) {
              throw new Error(`Path ${dirPath} exists but is not a directory`);
            }
          } catch (error: any) {
            if (error.code === "ENOENT") {
              throw new Error(`Directory ${dirPath} does not exist`);
            }
            throw error;
          }
        });
      },

      doesNotExist() {
        repo.register(`dir: ${dirPath} does not exist`, async () => {
          const fullPath = path.resolve(repoRoot, dirPath);
          try {
            await fs.access(fullPath);
            throw new Error(`Directory ${dirPath} exists but should not`);
          } catch (error: any) {
            if (error.code !== "ENOENT") {
              throw error;
            }
            // Directory doesn't exist, which is what we want
          }
        });
      },

      isEmpty() {
        repo.register(`dir: ${dirPath} is empty`, async () => {
          const fullPath = path.resolve(repoRoot, dirPath);
          const entries = await fs.readdir(fullPath);
          if (entries.length > 0) {
            throw new Error(`Directory ${dirPath} is not empty. Contains: ${entries.join(", ")}`);
          }
        });
      },

      contains(filename: string) {
        repo.register(`dir: ${dirPath} contains ${filename}`, async () => {
          const fullPath = path.resolve(repoRoot, dirPath);
          const entries = await fs.readdir(fullPath);
          if (!entries.includes(filename)) {
            throw new Error(`Directory ${dirPath} does not contain ${filename}. Contains: ${entries.join(", ")}`);
          }
        });
      },
    };
  };

  return dirIntegration;
}
