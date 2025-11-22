import {
  PluginContext,
  createPluginEntry,
  type VerificationBuilder,
} from "@verify-repo/engine";
import { checkFileContains, checkFileExists } from "./checks";
import type { FilePluginApi } from "./types";

type FileRoot = (filePath: string) => FilePluginApi;
type FileEntrypoint = FileRoot | FilePluginApi;

export const file = () => {
  return ({ root }: PluginContext) => {
    const buildEntry = (
      builder: VerificationBuilder,
      filePath?: string,
    ): FileEntrypoint => {
      if (filePath) {
        const methods = createFileMethods(builder, filePath);
        const api = createPluginEntry(builder, methods.positive, undefined);
        const notApi = createPluginEntry(builder, methods.negative, undefined);

        return Object.assign(api, { not: notApi }) as unknown as FilePluginApi;
      }

      return createPluginEntry(
        builder,
        {},
        (parent: VerificationBuilder, target: string) =>
          buildEntry(
            parent.createChild({ file: target }),
            target,
          ) as FilePluginApi,
      ) as FileRoot;
    };

    return {
      file(builder: VerificationBuilder) {
        return buildEntry(builder);
      },
    };
  };
};

function createFileMethods(builder: VerificationBuilder, filePath: string) {
  return {
    positive: {
      exists: async (_: VerificationBuilder) => {
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
      contains: async (_: VerificationBuilder, needle: string | RegExp) => {
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
      exists: async (_: VerificationBuilder) => {
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
      contains: async (_: VerificationBuilder, needle: string | RegExp) => {
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
