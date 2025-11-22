import {
  PluginContext,
  createPluginEntry,
  type VerificationBuilder,
} from "@repo-tests/core";
import { matchers } from "./matchers";
import type { FilePluginApi } from "./types";

type FileEntrypoint = ((filePath: string) => FilePluginApi) & FilePluginApi;

export const file = () => {
  return ({ root }: PluginContext) => {
    const buildEntry = (
      builder: VerificationBuilder,
      filePath?: string,
    ): FileEntrypoint => {
      const entry = createPluginEntry(
        builder,
        filePath ? createFileMethods(builder, filePath, root) : {},
        filePath
          ? undefined
          : (parent, target: string) =>
              buildEntry(parent.createChild({ file: target }), target),
      ) as FileEntrypoint;

      return entry;
    };

    return {
      file(builder) {
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
