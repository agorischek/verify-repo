import { GitPluginApi } from "./types";
import { PluginContext } from "@repo-tests/core";
import simpleGit from "simple-git";

const formatFiles = (files: { path: string; working: string; index: string }[]) =>
  files
    .map((file) => `${file.index}${file.working} ${file.path}`.trim())
    .join("\n");

export const git = () => {
  return ({ schedule, root }: PluginContext) => {
    const git = simpleGit(root);

    const api: GitPluginApi = Object.assign(
      function () {
        api.isClean();
      },
      {
        isClean() {
          schedule("git status should be clean", async ({ pass, fail }) => {
            const status = await git.status();
            if (status.isClean()) {
              pass("repository is clean");
              return;
            }
            const dirty = formatFiles(status.files);
            fail(
              dirty.length
                ? `repository has dirty files:\n${dirty}`
                : "repository has untracked changes",
            );
          });
        },
        hasNoConflicts() {
          schedule("git should have no conflicts", async ({ pass, fail }) => {
            const status = await git.status();
            if (status.conflicted.length === 0) {
              pass("no conflicted files");
            } else {
              fail(
                `conflicted files detected:\n${status.conflicted.join("\n")}`,
              );
            }
          });
        },
        hasStaged(path: string) {
          schedule(
            `git should have staged changes for "${path}"`,
            async ({ pass, fail }) => {
              const status = await git.status();
              const file = status.files.find((f) => f.path === path);

              if (!file) {
                fail(`File "${path}" not found in git status output.`);
                return;
              }

              if (file.index && file.index !== " " && file.index !== "?") {
                pass(`"${path}" is staged with status ${file.index}.`);
              } else {
                fail(`"${path}" is not staged (index status: "${file.index}").`);
              }
            },
          );
        },
        isOnBranch(branch: string) {
          schedule(
            `git should be on branch "${branch}"`,
            async ({ pass, fail }) => {
              const status = await git.status();
              if (status.current === branch) {
                pass(`checked-out branch is "${branch}".`);
              } else {
                fail(
                  `expected branch "${branch}" but was on "${status.current ?? "unknown"}".`,
                );
              }
            },
          );
        },
      },
    );

    return { git: api };
  };
};
