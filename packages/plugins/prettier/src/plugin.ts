import { PluginEntry, type PluginOptions, type RepoPlugin, type VerificationContext } from "@verify-repo/engine";
import { glob } from "glob";
import path from "node:path";
import { createRequire } from "node:module";
import { checkPrettierFormatted } from "./checks";
import type { PrettierPluginApi, PrettierSelectorApi } from "./types";

const require = createRequire(import.meta.url);

const DEFAULT_GLOBS = ["**/*.{js,jsx,ts,tsx,json,css,scss,less,html,md,mdx,yml,yaml,graphql,gql}"];
const DEFAULT_IGNORE = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"];

type Selection = { type: "pattern"; value: string } | { type: "file"; value: string } | undefined;

type PrettierLeaf = PrettierSelectorApi;
type PrettierRoot = PrettierPluginApi;
type PrettierEntrypoint = PrettierRoot | PrettierLeaf;

export const prettier = (): RepoPlugin => ({
  name: "Prettier",
  description: "Validate that files are formatted according to the local Prettier config.",
  docs: [
    {
      signature: "verify.prettier.isFormatted()",
      description: "Runs Prettier against default file globs in the repo root and fails when any file would change.",
    },
    {
      signature: 'verify.prettier("<glob>").isFormatted()',
      description: "Checks only files that match the provided glob pattern.",
    },
    {
      signature: 'verify.prettier.file("<path>").isFormatted()',
      description: "Targets a single file relative to the verify file.",
    },
  ],
  api() {
    const buildEntry = (context: VerificationContext, selection?: Selection): PrettierEntrypoint => {
      if (selection) {
        return context.entry(
          {
            isFormatted: () => scheduleFormatting(context, selection),
          },
          undefined,
        ) as PrettierLeaf;
      }

      const baseEntry = new PluginEntry(
        context,
        {
          isFormatted: () => scheduleFormatting(context, selection),
        },
        (parent: VerificationContext, pattern: string) =>
          buildEntry(parent.extend({ pattern }), {
            type: "pattern",
            value: pattern,
          }) as PrettierLeaf,
      );

      const rootEntry = Object.assign(baseEntry, {
        file: (filePath: string) =>
          buildEntry(context.extend({ file: filePath }), {
            type: "file",
            value: filePath,
          }) as PrettierLeaf,
      });

      return rootEntry as PrettierRoot;
    };

    return {
      prettier(context: VerificationContext) {
        return buildEntry(context);
      },
    };
  },
});

async function loadPrettier(dir: string) {
  const searchPaths = [dir, process.cwd()];
  for (const base of searchPaths) {
    try {
      const prettierPath = require.resolve("prettier", { paths: [base] });
      const prettierModule = await import(prettierPath);
      return prettierModule.default || prettierModule;
    } catch {
      // continue
    }
  }
  throw new Error('Could not find Prettier. Install "prettier" in your project to use this check.');
}

function scheduleFormatting(context: VerificationContext, selection: Selection) {
  const description = getDescription(selection);
  context.register(description, async ({ pass, fail }) => {
    try {
      const baseDir = context.dir;
      const prettierModule = await loadPrettier(baseDir);
      // resolveConfigFile requires a file path, not a directory
      const configFile = await prettierModule.resolveConfigFile(path.join(baseDir, "package.json"));
      const config = configFile ? await prettierModule.resolveConfig(configFile) : null;

      const filesToCheck = await resolveFiles(baseDir, selection);
      const result = await checkPrettierFormatted(filesToCheck, {
        config,
        root: baseDir,
        prettierModule,
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

async function resolveFiles(baseDir: string, selection: Selection): Promise<string[]> {
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
