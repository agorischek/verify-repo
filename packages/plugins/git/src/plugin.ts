import {
  PluginContext,
  PluginEntry,
  type RepoPlugin,
  type VerificationBuilder,
} from "@verify-repo/engine";
import path from "node:path";
import { createRequire } from "node:module";
import type { GitBranchPluginApi, GitPluginApi } from "./types";

const require = createRequire(import.meta.url);

type SimpleGit = ReturnType<typeof import("simple-git").default>;

const formatFiles = (
  files: { path: string; working: string; index: string }[],
) =>
  files
    .map((file) => `${file.index}${file.working} ${file.path}`.trim())
    .join("\n");

export const git = (): RepoPlugin => ({
  name: "Git",
  description:
    "Assert repository cleanliness, conflicts, branches, and staged files.",
  docs: [
    {
      signature: "verify.git.isClean()",
      description:
        "Fails if `git status` reports untracked, unstaged, or staged changes.",
    },
    {
      signature: "verify.git.hasNoConflicts()",
      description:
        "Ensures there are no files listed in `git status --short` as conflicted.",
    },
    {
      signature: 'verify.git.hasStaged("<path>")',
      description:
        "Asserts that the given file is staged (non-empty index status).",
    },
    {
      signature: 'verify.git.isOnBranch("<branch>")',
      description: "Checks that the current HEAD is on the expected branch.",
    },
    {
      signature: 'verify.git.branch("<branch>").isClean()',
      description:
        "Asserts that the branch is checked out and has no dirty files.",
    },
    {
      signature: 'verify.git.branch("<branch>").isCurrent()',
      description: "Only verifies that the target branch is checked out.",
    },
  ],
  api({ root }: PluginContext) {
    let clientPromise: Promise<SimpleGit> | null = null;

    const getClient = async (): Promise<SimpleGit> => {
      if (!clientPromise) {
        clientPromise = (async () => {
          const searchPaths = [root, process.cwd()].filter(
            (p): p is string => p !== undefined,
          );
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
          throw new Error(
            'Could not find simple-git. Install "simple-git" in your project to use this check.',
          );
        })();
      }
      return clientPromise;
    };

    const buildEntry = (builder: VerificationBuilder): GitPluginApi => {
      const entry = new PluginEntry(builder, {
        isClean: () => scheduleClean(builder, getClient),
        hasNoConflicts: () => scheduleConflicts(builder, getClient),
        hasStaged: (_b: VerificationBuilder, filePath: string) => {
          const base = builder.cwd;
          const repoRoot = builder.root ?? process.cwd();
          const abs = path.resolve(base, filePath);
          const rel = path.relative(repoRoot, abs);
          return scheduleHasStaged(builder, getClient, rel);
        },
        isOnBranch: (_b: VerificationBuilder, branch: string) =>
          scheduleIsOnBranch(builder, getClient, branch),
      }) as GitPluginApi;

      entry.branch = (branch: string) => {
        const child = builder.createChild({ branch });
        return createBranchEntry(child, getClient, branch);
      };

      return entry;
    };

    return {
      git(builder: VerificationBuilder) {
        return buildEntry(builder);
      },
    };
  },
});

function createBranchEntry(
  builder: VerificationBuilder,
  getGit: () => Promise<SimpleGit>,
  branch: string,
): GitBranchPluginApi {
  return new PluginEntry(builder, {
    isClean: () => scheduleBranchClean(builder, getGit, branch),
    isCurrent: () => scheduleIsOnBranch(builder, getGit, branch),
  }) as GitBranchPluginApi;
}

function scheduleClean(
  builder: VerificationBuilder,
  getGit: () => Promise<SimpleGit>,
) {
  builder.schedule("git status should be clean", async ({ pass, fail }) => {
    try {
      const git = await getGit();
      const status = await git.status();
      if (status.isClean()) {
        pass("repository is clean");
        return;
      }
      const dirty = formatFiles(
        status.files.map((f) => ({
          path: f.path,
          working: f.working_dir || " ",
          index: f.index || " ",
        })),
      );
      fail(
        dirty.length
          ? `repository has dirty files:\n${dirty}`
          : "repository has untracked changes",
      );
    } catch (error) {
      fail("Failed to determine git status.", error);
    }
  });
}

function scheduleConflicts(
  builder: VerificationBuilder,
  getGit: () => Promise<SimpleGit>,
) {
  builder.schedule("git should have no conflicts", async ({ pass, fail }) => {
    try {
      const git = await getGit();
      const status = await git.status();
      if (status.conflicted.length === 0) {
        pass("no conflicted files");
      } else {
        fail(`conflicted files detected:\n${status.conflicted.join("\n")}`);
      }
    } catch (error) {
      fail("Failed to inspect git conflicts.", error);
    }
  });
}

function scheduleHasStaged(
  builder: VerificationBuilder,
  getGit: () => Promise<SimpleGit>,
  filePath: string,
) {
  builder.schedule(
    `git should have staged changes for "${filePath}"`,
    async ({ pass, fail }) => {
      try {
        const git = await getGit();
        const status = await git.status();
        const file = status.files.find((f) => f.path === filePath);

        if (!file) {
          fail(`File "${filePath}" not found in git status output.`);
          return;
        }

        if (file.index && file.index !== " " && file.index !== "?") {
          pass(`"${filePath}" is staged with status ${file.index}.`);
        } else {
          fail(`"${filePath}" is not staged (index status: "${file.index}").`);
        }
      } catch (error) {
        fail(`Failed to inspect staged status for "${filePath}".`, error);
      }
    },
  );
}

function scheduleIsOnBranch(
  builder: VerificationBuilder,
  getGit: () => Promise<SimpleGit>,
  branch: string,
) {
  builder.schedule(
    `git should be on branch "${branch}"`,
    async ({ pass, fail }) => {
      try {
        const git = await getGit();
        const status = await git.status();
        if (status.current === branch) {
          pass(`checked-out branch is "${branch}".`);
        } else {
          fail(
            `expected branch "${branch}" but was on "${status.current ?? "unknown"}".`,
          );
        }
      } catch (error) {
        fail("Failed to read current git branch.", error);
      }
    },
  );
}

function scheduleBranchClean(
  builder: VerificationBuilder,
  getGit: () => Promise<SimpleGit>,
  branch: string,
) {
  builder.schedule(
    `branch "${branch}" should be current and clean`,
    async ({ pass, fail }) => {
      try {
        const git = await getGit();
        const status = await git.status();
        if (status.current !== branch) {
          fail(
            `expected branch "${branch}" but was on "${status.current ?? "unknown"}".`,
          );
          return;
        }
        if (status.isClean()) {
          pass(`branch "${branch}" is clean.`);
        } else {
          const dirty = formatFiles(
            status.files.map((f) => ({
              path: f.path,
              working: f.working_dir || " ",
              index: f.index || " ",
            })),
          );
          fail(
            dirty.length
              ? `branch "${branch}" has dirty files:\n${dirty}`
              : `branch "${branch}" has untracked changes`,
          );
        }
      } catch (error) {
        fail(`Failed to inspect cleanliness of branch "${branch}".`, error);
      }
    },
  );
}
