import {
  PluginContext,
  createPluginEntry,
  type VerificationBuilder,
} from "@verify-repo/engine";
import simpleGit from "simple-git";
import type { GitBranchPluginApi, GitPluginApi } from "./types";

const formatFiles = (files: { path: string; working: string; index: string }[]) =>
  files
    .map((file) => `${file.index}${file.working} ${file.path}`.trim())
    .join("\n");

export const git = () => {
  return ({ root }: PluginContext) => {
    const client = simpleGit(root);

    const buildEntry = (builder: VerificationBuilder): GitPluginApi => {
      const entry = createPluginEntry(builder, {
        isClean: () => scheduleClean(builder, client),
        hasNoConflicts: () => scheduleConflicts(builder, client),
        hasStaged: (_b: VerificationBuilder, filePath: string) =>
          scheduleHasStaged(builder, client, filePath),
        isOnBranch: (_b: VerificationBuilder, branch: string) =>
          scheduleIsOnBranch(builder, client, branch),
      }) as GitPluginApi;

      entry.branch = (branch: string) => {
        const child = builder.createChild({ branch });
        return createBranchEntry(child, client, branch);
      };

      return entry;
    };

    return {
      git(builder) {
        return buildEntry(builder);
      },
    };
  };
};

function createBranchEntry(
  builder: VerificationBuilder,
  git: ReturnType<typeof simpleGit>,
  branch: string,
): GitBranchPluginApi {
  return createPluginEntry(builder, {
    isClean: () => scheduleBranchClean(builder, git, branch),
    isCurrent: () => scheduleIsOnBranch(builder, git, branch),
  }) as GitBranchPluginApi;
}

function scheduleClean(
  builder: VerificationBuilder,
  git: ReturnType<typeof simpleGit>,
) {
  builder.schedule("git status should be clean", async ({ pass, fail }) => {
    try {
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
  git: ReturnType<typeof simpleGit>,
) {
  builder.schedule("git should have no conflicts", async ({ pass, fail }) => {
    try {
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
  git: ReturnType<typeof simpleGit>,
  filePath: string,
) {
  builder.schedule(
    `git should have staged changes for "${filePath}"`,
    async ({ pass, fail }) => {
      try {
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
  git: ReturnType<typeof simpleGit>,
  branch: string,
) {
  builder.schedule(
    `git should be on branch "${branch}"`,
    async ({ pass, fail }) => {
      try {
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
  git: ReturnType<typeof simpleGit>,
  branch: string,
) {
  builder.schedule(
    `branch "${branch}" should be current and clean`,
    async ({ pass, fail }) => {
      try {
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
