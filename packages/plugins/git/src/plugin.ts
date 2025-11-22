import { GitPluginApi } from "./types";
import { PluginContext } from "@repo-tests/core";
import simpleGit from "simple-git";

export const git = () => {
  return ({ test, expect, root }: PluginContext) => {
    const git = simpleGit(root);

    const api: GitPluginApi = Object.assign(
      function () {
        api.isClean();
      },
      {
        isClean() {
          test("git status should be clean", async () => {
            const status = await git.status();
            expect(status.isClean()).toBe(true);
          });
        },
        hasNoConflicts() {
          test("git should have no conflicts", async () => {
            const status = await git.status();
            expect(status.conflicted.length).toBe(0);
          });
        },
        hasStaged(path: string) {
          test(`git should have staged changes for "${path}"`, async () => {
            const status = await git.status();
            const file = status.files.find((f) => f.path === path);

            if (!file) {
              throw new Error(`File "${path}" not found in git status`);
            }

            // In git status porcelain:
            // X (index) can be 'M', 'A', 'D', 'R', 'C', 'U' for staged
            // ' ' or '?' means not staged
            expect(file.index).not.toBe(" ");
            expect(file.index).not.toBe("?");
          });
        },
        isOnBranch(branch: string) {
          test(`git should be on branch "${branch}"`, async () => {
            const status = await git.status();
            expect(status.current).toBe(branch);
          });
        },
      },
    );

    return { git: api };
  };
};
