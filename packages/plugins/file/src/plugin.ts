import {
  PluginContext,
  createPluginEntry,
  type VerificationBuilder,
} from "@verify-repo/engine";
import { matchers } from "./matchers";
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
        return createPluginEntry(
          builder,
          createFileMethods(builder, filePath, root),
          undefined,
        ) as FilePluginApi;
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

function createFileMethods(
  builder: VerificationBuilder,
  filePath: string,
  root?: string,
) {
  return {
    exists: async () => {
      const description = `File "${filePath}" should exist`;
      builder.schedule(description, async ({ pass, fail }) => {
        const result = await matchers.toExistAsFile(filePath, root);
        if (result.pass) {
          pass(result.message());
        } else {
          fail(result.message());
        }
      });
    },
    contains: async (_: VerificationBuilder, needle: string | RegExp) => {
      const description = `File "${filePath}" should contain ${String(needle)}`;
      builder.schedule(description, async ({ pass, fail }) => {
        const result = await matchers.toContainText(filePath, needle, root);
        if (result.pass) {
          pass(result.message());
        } else {
          fail(result.message());
        }
      });
    },
  };
}
