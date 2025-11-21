import { execSync } from "child_process";
import type { RepoTests } from "../core";

export function createGitIntegration(repo: RepoTests) {
  const repoRoot = repo.getRepoRoot();

  async function getGitStatus() {
    try {
      const status = execSync("git status --porcelain", {
        cwd: repoRoot,
        encoding: "utf8",
      });
      return {
        isClean: status.trim().length === 0,
        modified: status
          .split("\n")
          .filter((line) => line.startsWith(" M"))
          .map((line) => line.substring(3)),
        created: status
          .split("\n")
          .filter((line) => line.startsWith("??"))
          .map((line) => line.substring(3)),
        deleted: status
          .split("\n")
          .filter((line) => line.startsWith(" D"))
          .map((line) => line.substring(3)),
      };
    } catch {
      return {
        isClean: true,
        modified: [],
        created: [],
        deleted: [],
      };
    }
  }

  const gitIntegration = function () {
    repo.register("git: working tree clean", async () => {
      const status = await getGitStatus();
      expect(status).toBeCleanGitStatus();
    });
  };

  const callable: any = gitIntegration;

  callable.isClean = function () {
    repo.register("git: working tree clean", async () => {
      const status = await getGitStatus();
      expect(status).toBeCleanGitStatus();
    });
  };

  callable.hasNoConflicts = function () {
    repo.register("git: has no conflicts", async () => {
      try {
        execSync("git diff --check", { cwd: repoRoot, encoding: "utf8" });
      } catch (error: any) {
        throw new Error(`Git conflicts detected:\n${error.stdout || error.message}`);
      }
    });
  };

  callable.hasStaged = function (pathPattern: string) {
    repo.register(`git: has staged ${pathPattern}`, async () => {
      try {
        const staged = execSync("git diff --cached --name-only", {
          cwd: repoRoot,
          encoding: "utf8",
        });
        const files = staged.trim().split("\n");
        const matches = files.some((file) => file.includes(pathPattern));
        if (!matches) {
          throw new Error(`No staged files match pattern: ${pathPattern}`);
        }
      } catch (error: any) {
        if (!error.message.includes("No staged files")) {
          throw error;
        }
        throw new Error(`No staged files match pattern: ${pathPattern}`);
      }
    });
  };

  callable.isOnBranch = function (branch: string) {
    repo.register(`git: is on branch ${branch}`, async () => {
      try {
        const currentBranch = execSync("git branch --show-current", {
          cwd: repoRoot,
          encoding: "utf8",
        }).trim();
        if (currentBranch !== branch) {
          throw new Error(`Expected to be on branch "${branch}", but on "${currentBranch}"`);
        }
      } catch (error: any) {
        throw new Error(`Failed to check git branch: ${error.message}`);
      }
    });
  };

  return callable;
}
