import { type PluginOptions, type RepoPlugin, type VerificationContext } from "@verify-repo/engine";
import path from "node:path";
import { createRequire } from "node:module";
import type { GitBranchPluginApi, GitPluginApi } from "./types";
import {
  scheduleClean,
  scheduleConflicts,
  scheduleHasStaged,
  scheduleIsOnBranch,
  scheduleBranchClean,
} from "./schedules";

const require = createRequire(import.meta.url);

type SimpleGit = ReturnType<typeof import("simple-git").default>;

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
