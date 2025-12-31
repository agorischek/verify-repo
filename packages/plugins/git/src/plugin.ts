import { type PluginOptions, type RepoPlugin, type VerificationContext } from "@verify-repo/engine";
import path from "node:path";
import { createRequire } from "node:module";
import type { GitBranchPluginApi, GitPluginApi } from "./types";

const require = createRequire(import.meta.url);

type SimpleGit = ReturnType<typeof import("simple-git").default>;

const formatFiles = (files: { path: string; working: string; index: string }[]) =>
  files.map((file) => `${file.index}${file.working} ${file.path}`.trim()).join("\n");

export const git = (): RepoPlugin => ({
  name: "Git",
  description: "Assert repository cleanliness, conflicts, branches, and staged files.",
  docs: [
    {
      signature: "verify.git.isClean()",
      description: "Fails if `git status` reports untracked, unstaged, or staged changes.",
    },
    {
      signature: "verify.git.hasNoConflicts()",
      description: "Ensures there are no files listed in `git status --short` as conflicted.",
    },
    {
      signature: 'verify.git.hasStaged("<path>")',
      description: "Asserts that the given file is staged (non-empty index status).",
    },
    {
      signature: 'verify.git.isOnBranch("<branch>")',
      description: "Checks that the current HEAD is on the expected branch.",
    },
    {
      signature: 'verify.git.branch("<branch>").isClean()',
      description: "Asserts that the branch is checked out and has no dirty files.",
    },
    {
      signature: 'verify.git.branch("<branch>").isCurrent()',
      description: "Only verifies that the target branch is checked out.",
    },
  ],
  api({ root }: PluginOptions) {
    let clientPromise: Promise<SimpleGit> | null = null;

    const getClient = async (): Promise<SimpleGit> => {
      if (!clientPromise) {
        clientPromise = (async () => {
          const searchPaths = [root, process.cwd()].filter((p): p is string => p !== undefined);
          for (const base of searchPaths) {
            try {
              const simpleGitPath = require.resolve("simple-git", {
                paths: [base],
              });
              const simpleGitModule = await import(simpleGitPath);
              const simpleGit = simpleGitModule.default || simpleGitModule;
              return simpleGit(root ?? process.cwd());
            } catch {
              // continue
            }
          }
          throw new Error('Could not find simple-git. Install "simple-git" in your project to use this check.');
        })();
      }
      return clientPromise;
    };

    const buildEntry = (context: VerificationContext): GitPluginApi => {
      const entry = context.entry({
        isClean: () => scheduleClean(context, getClient),
        hasNoConflicts: () => scheduleConflicts(context, getClient),
        hasStaged: (filePath: string) => {
          const base = context.dir;
          const repoRoot = context.root ?? process.cwd();
          const abs = path.resolve(base, filePath);
          const rel = path.relative(repoRoot, abs);
          return scheduleHasStaged(context, getClient, rel);
        },
        isOnBranch: (branch: string) => scheduleIsOnBranch(context, getClient, branch),
      }) as GitPluginApi;

      entry.branch = (branch: string) => {
        const child = context.extend({ branch });
        return createBranchEntry(child, getClient, branch);
      };

      return entry;
    };

    return {
      git(context: VerificationContext) {
        return buildEntry(context);
      },
    };
  },
});

function createBranchEntry(
  context: VerificationContext,
  getGit: () => Promise<SimpleGit>,
  branch: string,
): GitBranchPluginApi {
  return context.entry({
    isClean: () => scheduleBranchClean(context, getGit, branch),
    isCurrent: () => scheduleIsOnBranch(context, getGit, branch),
  }) as GitBranchPluginApi;
}

function scheduleClean(context: VerificationContext, getGit: () => Promise<SimpleGit>) {
  context.register("git status should be clean", async () => {
    try {
      const git = await getGit();
      const status = await git.status();
      if (status.isClean()) {
        return { pass: true, message: "repository is clean" };
      }
      const dirty = formatFiles(
        status.files.map((f) => ({
          path: f.path,
          working: f.working_dir || " ",
          index: f.index || " ",
        })),
      );
      return {
        pass: false,
        message: dirty.length ? `repository has dirty files:\n${dirty}` : "repository has untracked changes",
      };
    } catch (error) {
      return { pass: false, message: "Failed to determine git status.", error };
    }
  });
}

function scheduleConflicts(context: VerificationContext, getGit: () => Promise<SimpleGit>) {
  context.register("git should have no conflicts", async () => {
    try {
      const git = await getGit();
      const status = await git.status();
      if (status.conflicted.length === 0) {
        return { pass: true, message: "no conflicted files" };
      } else {
        return { pass: false, message: `conflicted files detected:\n${status.conflicted.join("\n")}` };
      }
    } catch (error) {
      return { pass: false, message: "Failed to inspect git conflicts.", error };
    }
  });
}

function scheduleHasStaged(context: VerificationContext, getGit: () => Promise<SimpleGit>, filePath: string) {
  context.register(`git should have staged changes for "${filePath}"`, async () => {
    try {
      const git = await getGit();
      const status = await git.status();
      const file = status.files.find((f) => f.path === filePath);

      if (!file) {
        return { pass: false, message: `File "${filePath}" not found in git status output.` };
      }

      if (file.index && file.index !== " " && file.index !== "?") {
        return { pass: true, message: `"${filePath}" is staged with status ${file.index}.` };
      } else {
        return { pass: false, message: `"${filePath}" is not staged (index status: "${file.index}").` };
      }
    } catch (error) {
      return { pass: false, message: `Failed to inspect staged status for "${filePath}".`, error };
    }
  });
}

function scheduleIsOnBranch(context: VerificationContext, getGit: () => Promise<SimpleGit>, branch: string) {
  context.register(`git should be on branch "${branch}"`, async () => {
    try {
      const git = await getGit();
      const status = await git.status();
      if (status.current === branch) {
        return { pass: true, message: `checked-out branch is "${branch}".` };
      } else {
        return { pass: false, message: `expected branch "${branch}" but was on "${status.current ?? "unknown"}".` };
      }
    } catch (error) {
      return { pass: false, message: "Failed to read current git branch.", error };
    }
  });
}

function scheduleBranchClean(context: VerificationContext, getGit: () => Promise<SimpleGit>, branch: string) {
  context.register(`branch "${branch}" should be current and clean`, async () => {
    try {
      const git = await getGit();
      const status = await git.status();
      if (status.current !== branch) {
        return { pass: false, message: `expected branch "${branch}" but was on "${status.current ?? "unknown"}".` };
      }
      if (status.isClean()) {
        return { pass: true, message: `branch "${branch}" is clean.` };
      } else {
        const dirty = formatFiles(
          status.files.map((f) => ({
            path: f.path,
            working: f.working_dir || " ",
            index: f.index || " ",
          })),
        );
        return {
          pass: false,
          message: dirty.length
            ? `branch "${branch}" has dirty files:\n${dirty}`
            : `branch "${branch}" has untracked changes`,
        };
      }
    } catch (error) {
      return { pass: false, message: `Failed to inspect cleanliness of branch "${branch}".`, error };
    }
  });
}
