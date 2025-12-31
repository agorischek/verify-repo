import { type PluginOptions, type RepoPlugin, type VerificationContext } from "@verify-repo/engine";
import { checkFileContains, checkFileExists, checkDirExists, checkFilesLineCount } from "./checks";
import type { FilePluginApi, DirPluginApi, FilesPluginApi, FileLineCountOptions, GlobPattern } from "./types";

type FileRoot = (filePath: string) => FilePluginApi;
type FileEntrypoint = FileRoot | FilePluginApi;
type FilesRoot = (pattern: GlobPattern) => FilesPluginApi;
type FilesEntrypoint = FilesRoot | FilesPluginApi;
type DirRoot = (dirPath: string) => DirPluginApi;

export const fs = (): RepoPlugin => ({
  name: "Filesystem",
  description: "Assertions for files and directories relative to the verify file.",
  docs: [
    {
      signature: 'verify.file("<path>").exists()',
      description: "Passes when the target file exists relative to the current verify file (or repo root).",
    },
    {
      signature: 'verify.file("<path>").contains(textOrPattern)',
      description: "Ensures the file contents include the provided string or satisfy the regular expression.",
    },
    {
      signature: 'verify.file("<path>").not.exists()',
      description: "Passes only when the file is missing.",
    },
    {
      signature: 'verify.file("<path>").not.contains(textOrPattern)',
      description: "Fails if the file contains the provided string or matches the expression.",
    },
    {
      signature: 'verify.dir("<path>").exists()',
      description: "Ensures the directory exists.",
    },
    {
      signature: 'verify.dir("<path>").not.exists()',
      description: "Ensures the directory does not exist.",
    },
    {
      signature: 'verify.files("<glob>").lines({ min?, max? })',
      description: "Ensures every file matching the glob pattern has a line count between min and max (inclusive).",
    },
  ],
  api() {
    const buildFileEntry = (context: VerificationContext, filePath?: string): FileEntrypoint => {
      if (filePath) {
        const methods = createFileMethods(context, filePath);
        const api = context.entry(methods.positive);
        const notApi = context.entry(methods.negative);

        return Object.assign(api, { not: notApi }) as unknown as FilePluginApi;
      }

      return context.entry(
        {},
        (parent: VerificationContext, target: string) =>
          buildFileEntry(parent.extend({ file: target }), target) as FilePluginApi,
      ) as FileRoot;
    };

    const buildDirEntry = (context: VerificationContext, dirPath?: string): DirRoot | DirPluginApi => {
      if (dirPath) {
        const methods = createDirMethods(context, dirPath);
        const api = context.entry(methods.positive);
        const notApi = context.entry(methods.negative);

        return Object.assign(api, { not: notApi }) as unknown as DirPluginApi;
      }

      return context.entry(
        {},
        (parent: VerificationContext, target: string) =>
          buildDirEntry(parent.extend({ dir: target }), target) as DirPluginApi,
      ) as DirRoot;
    };

    const buildFilesEntry = (context: VerificationContext, pattern?: GlobPattern): FilesEntrypoint => {
      if (pattern) {
        const methods = createFilesMethods(context, pattern);
        return context.entry(methods) as unknown as FilesPluginApi;
      }

      return context.entry(
        {},
        (parent: VerificationContext, target: GlobPattern) =>
          buildFilesEntry(parent.extend({ pattern: target }), target) as FilesPluginApi,
      ) as FilesRoot;
    };

    return {
      file(context: VerificationContext) {
        return buildFileEntry(context);
      },
      files(context: VerificationContext) {
        return buildFilesEntry(context);
      },
      dir(context: VerificationContext) {
        return buildDirEntry(context);
      },
    };
  },
});

function createFileMethods(context: VerificationContext, filePath: string) {
  return {
    positive: {
      exists: async () => {
        const description = `File "${filePath}" should exist`;
        context.register(description, async ({ pass, fail }) => {
          const result = await checkFileExists(filePath, context.dir);
          if (result.pass) {
            pass(result.message());
          } else {
            fail(result.message());
          }
        });
      },
      contains: async (needle: string | RegExp) => {
        const description = `File "${filePath}" should contain ${String(needle)}`;
        context.register(description, async ({ pass, fail }) => {
          const result = await checkFileContains(filePath, needle, context.dir);
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
        context.register(description, async ({ pass, fail }) => {
          const result = await checkFileExists(filePath, context.dir);
          if (!result.pass) {
            pass(`File "${filePath}" does not exist.`);
          } else {
            fail(`Expected file "${filePath}" to not exist, but it does.`);
          }
        });
      },
      contains: async (needle: string | RegExp) => {
        const description = `File "${filePath}" should not contain ${String(needle)}`;
        context.register(description, async ({ pass, fail }) => {
          const result = await checkFileContains(filePath, needle, context.dir);
          if (!result.pass) {
            pass(`File "${filePath}" does not contain ${String(needle)}.`);
          } else {
            fail(`Expected file "${filePath}" to not contain ${String(needle)}, but it does.`);
          }
        });
      },
    },
  };
}

function createDirMethods(context: VerificationContext, dirPath: string) {
  return {
    positive: {
      exists: async () => {
        const description = `Directory "${dirPath}" should exist`;
        context.register(description, async ({ pass, fail }) => {
          const result = await checkDirExists(dirPath, context.dir);
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
        context.register(description, async ({ pass, fail }) => {
          const result = await checkDirExists(dirPath, context.dir);
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

function createFilesMethods(context: VerificationContext, pattern: GlobPattern) {
  return {
    lines: (options: FileLineCountOptions) => {
      const bounds = [
        options.min !== undefined ? `min=${options.min}` : null,
        options.max !== undefined ? `max=${options.max}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      const description = `Files matching "${pattern}" should have line count within ${bounds}`;

      context.register(description, async ({ pass, fail }) => {
        const result = await checkFilesLineCount(pattern, options, context.dir);
        if (result.pass) {
          pass(result.message());
        } else {
          fail(result.message());
        }
      });
    },
  };
}
