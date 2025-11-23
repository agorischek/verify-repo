import {
  PluginContext,
  PluginEntry,
  type RepoPlugin,
  type VerificationBuilder,
} from "@verify-repo/engine";
import { checkFileContains, checkFileExists, checkDirExists } from "./checks";
import type { FilePluginApi, DirPluginApi } from "./types";

type FileRoot = (filePath: string) => FilePluginApi;
type FileEntrypoint = FileRoot | FilePluginApi;
type DirRoot = (dirPath: string) => DirPluginApi;

export const fs = (): RepoPlugin => ({
  name: "Filesystem",
  description:
    "Assertions for files and directories relative to the verify file.",
  docs: [
    {
      signature: 'verify.file("<path>").exists()',
      description:
        "Passes when the target file exists relative to the current verify file (or repo root).",
    },
    {
      signature: 'verify.file("<path>").contains(textOrPattern)',
      description:
        "Ensures the file contents include the provided string or satisfy the regular expression.",
    },
    {
      signature: 'verify.file("<path>").not.exists()',
      description: "Passes only when the file is missing.",
    },
    {
      signature: 'verify.file("<path>").not.contains(textOrPattern)',
      description:
        "Fails if the file contains the provided string or matches the expression.",
    },
    {
      signature: 'verify.dir("<path>").exists()',
      description: "Ensures the directory exists.",
    },
    {
      signature: 'verify.dir("<path>").not.exists()',
      description: "Ensures the directory does not exist.",
    },
  ],
  api(_context: PluginContext) {
    const buildFileEntry = (
      builder: VerificationBuilder,
      filePath?: string,
    ): FileEntrypoint => {
      if (filePath) {
        const methods = createFileMethods(builder, filePath);
        const api = new PluginEntry(builder, methods.positive, undefined);
        const notApi = new PluginEntry(builder, methods.negative, undefined);

        return Object.assign(api, { not: notApi }) as unknown as FilePluginApi;
      }

      return new PluginEntry(
        builder,
        {},
        (parent: VerificationBuilder, target: string) =>
          buildFileEntry(
            parent.createChild({ file: target }),
            target,
          ) as FilePluginApi,
      ) as FileRoot;
    };

    const buildDirEntry = (
      builder: VerificationBuilder,
      dirPath?: string,
    ): DirRoot | DirPluginApi => {
      if (dirPath) {
        const methods = createDirMethods(builder, dirPath);
        const api = new PluginEntry(builder, methods.positive, undefined);
        const notApi = new PluginEntry(builder, methods.negative, undefined);

        return Object.assign(api, { not: notApi }) as unknown as DirPluginApi;
      }

      return new PluginEntry(
        builder,
        {},
        (parent: VerificationBuilder, target: string) =>
          buildDirEntry(
            parent.createChild({ dir: target }),
            target,
          ) as DirPluginApi,
      ) as DirRoot;
    };

    return {
      file(builder: VerificationBuilder) {
        return buildFileEntry(builder);
      },
      dir(builder: VerificationBuilder) {
        return buildDirEntry(builder);
      },
    };
  },
});

function createFileMethods(builder: VerificationBuilder, filePath: string) {
  return {
    positive: {
      exists: async () => {
        const description = `File "${filePath}" should exist`;
        builder.schedule(description, async ({ pass, fail }) => {
          const result = await checkFileExists(filePath, builder.cwd);
          if (result.pass) {
            pass(result.message());
          } else {
            fail(result.message());
          }
        });
      },
      contains: async (needle: string | RegExp) => {
        const description = `File "${filePath}" should contain ${String(
          needle,
        )}`;
        builder.schedule(description, async ({ pass, fail }) => {
          const result = await checkFileContains(filePath, needle, builder.cwd);
          if (result.pass) {
            pass(result.message());
          } else {
            fail(result.message());
          }
        });
      },
    },
    negative: {
      exists: async () => {
        const description = `File "${filePath}" should not exist`;
        builder.schedule(description, async ({ pass, fail }) => {
          const result = await checkFileExists(filePath, builder.cwd);
          if (!result.pass) {
            pass(`File "${filePath}" does not exist.`);
          } else {
            fail(`Expected file "${filePath}" to not exist, but it does.`);
          }
        });
      },
      contains: async (needle: string | RegExp) => {
        const description = `File "${filePath}" should not contain ${String(
          needle,
        )}`;
        builder.schedule(description, async ({ pass, fail }) => {
          const result = await checkFileContains(filePath, needle, builder.cwd);
          if (!result.pass) {
            pass(`File "${filePath}" does not contain ${String(needle)}.`);
          } else {
            fail(
              `Expected file "${filePath}" to not contain ${String(
                needle,
              )}, but it does.`,
            );
          }
        });
      },
    },
  };
}

function createDirMethods(builder: VerificationBuilder, dirPath: string) {
  return {
    positive: {
      exists: async () => {
        const description = `Directory "${dirPath}" should exist`;
        builder.schedule(description, async ({ pass, fail }) => {
          const result = await checkDirExists(dirPath, builder.cwd);
          if (result.pass) {
            pass(result.message());
          } else {
            fail(result.message());
          }
        });
      },
    },
    negative: {
      exists: async () => {
        const description = `Directory "${dirPath}" should not exist`;
        builder.schedule(description, async ({ pass, fail }) => {
          const result = await checkDirExists(dirPath, builder.cwd);
          if (!result.pass) {
            pass(`Directory "${dirPath}" does not exist.`);
          } else {
            fail(`Expected directory "${dirPath}" to not exist, but it does.`);
          }
        });
      },
    },
  };
}
