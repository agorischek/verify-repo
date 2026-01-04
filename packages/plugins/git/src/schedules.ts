import type { VerificationContext } from "@verify-repo/engine";

type SimpleGit = ReturnType<typeof import("simple-git").default>;

const formatFiles = (files: { path: string; working: string; index: string }[]) =>
  files.map((file) => `${file.index}${file.working} ${file.path}`.trim()).join("\n");

export function scheduleClean(context: VerificationContext, getGit: () => Promise<SimpleGit>) {
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

export function scheduleConflicts(context: VerificationContext, getGit: () => Promise<SimpleGit>) {
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

export function scheduleHasStaged(context: VerificationContext, getGit: () => Promise<SimpleGit>, filePath: string) {
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

export function scheduleIsOnBranch(context: VerificationContext, getGit: () => Promise<SimpleGit>, branch: string) {
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

export function scheduleBranchClean(context: VerificationContext, getGit: () => Promise<SimpleGit>, branch: string) {
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
