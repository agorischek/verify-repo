import {
  PluginContext,
  createPluginEntry,
  type VerificationBuilder,
} from "@repo-tests/core";
import { glob } from "glob";
import path from "node:path";
import prettierModule from "prettier";
import { matchers } from "./matchers";
import type { PrettierPluginApi } from "./types";

const DEFAULT_GLOBS = [
  "**/*.{js,jsx,ts,tsx,json,css,scss,less,html,md,mdx,yml,yaml,graphql,gql}",
];
const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.git/**",
];

type Selection =
  | { type: "pattern"; value: string }
  | { type: "file"; value: string }
  | undefined;

type PrettierEntrypoint = PrettierPluginApi;

export const prettier = () => {
  return ({ root }: PluginContext) => {
    const buildEntry = (
      builder: VerificationBuilder,
      selection?: Selection,
    ): PrettierEntrypoint => {
      const entry = createPluginEntry(
        builder,
        {
          isFormatted: () => scheduleFormatting(builder, root, selection),
        },
        selection
          ? undefined
          : (parent, pattern: string) =>
              buildEntry(
                parent.createChild({ pattern }),
                { type: "pattern", value: pattern },
              ),
      ) as PrettierEntrypoint;

      entry.file = (filePath: string) =>
        buildEntry(
          builder.createChild({ file: filePath }),
          { type: "file", value: filePath },
        );

      return entry;
    };

    return {
      prettier(builder) {
        return buildEntry(builder);
      },
    };
  };
};

function scheduleFormatting(
  builder: VerificationBuilder,
  root: string | undefined,
  selection: Selection,
) {
  const description = getDescription(selection);
  builder.schedule(description, async ({ pass, fail }) => {
    try {
      const baseDir = root || process.cwd();
      const configFile = await prettierModule.resolveConfigFile(baseDir);
      const config = configFile
        ? await prettierModule.resolveConfig(configFile)
        : null;

      const filesToCheck = await resolveFiles(baseDir, selection);
      const result = await matchers.toBePrettierFormatted(filesToCheck, {
        config,
        root: baseDir,
      });

      if (result.pass) {
        pass(result.message());
      } else {
        fail(result.message());
      }
    } catch (error) {
      fail("Failed to verify Prettier formatting.", error);
    }
  });
}

function getDescription(selection: Selection) {
  if (!selection) {
    return "all files should be formatted";
  }
  if (selection.type === "pattern") {
    return `files matching "${selection.value}" should be formatted`;
  }
  return `file "${selection.value}" should be formatted`;
}

async function resolveFiles(
  baseDir: string,
  selection: Selection,
): Promise<string[]> {
  if (!selection) {
    return collectDefaultFiles(baseDir);
  }

  if (selection.type === "file") {
    return [path.resolve(baseDir, selection.value)];
  }

  const matches = await glob(selection.value, {
    cwd: baseDir,
    absolute: true,
    ignore: DEFAULT_IGNORE,
  });
  return [...new Set(matches)];
}

async function collectDefaultFiles(baseDir: string) {
  const matches = await Promise.all(
    DEFAULT_GLOBS.map((pattern) =>
      glob(pattern, {
        cwd: baseDir,
        absolute: true,
        ignore: DEFAULT_IGNORE,
      }),
    ),
  );
  return [...new Set(matches.flat())];
}
