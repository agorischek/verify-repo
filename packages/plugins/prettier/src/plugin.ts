import { PrettierPluginApi } from "./types";
import { PluginContext } from "@repo-tests/core";
import { glob } from "glob";
import prettierModule from "prettier";
import { matchers } from "./matchers";

const DEFAULT_GLOBS = [
  "**/*.{js,jsx,ts,tsx,json,css,scss,less,html,md,mdx,yml,yaml,graphql,gql}",
];
const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.git/**",
];

export const prettier = () => {
  return ({ schedule, root }: PluginContext) => {
    const api: PrettierPluginApi = function prettier(globPattern?: string) {
      schedule(
        globPattern
          ? `files matching "${globPattern}" should be formatted`
          : "all files should be formatted",
        async ({ pass, fail }) => {
          const baseDir = root || process.cwd();

          const configFile = await prettierModule.resolveConfigFile(baseDir);
          const config = configFile
            ? await prettierModule.resolveConfig(configFile)
            : null;

          const filesToCheck = globPattern
            ? await glob(globPattern, {
                cwd: baseDir,
                absolute: true,
                ignore: DEFAULT_IGNORE,
              })
            : await collectDefaultFiles(baseDir);

          const result = await matchers.toBePrettierFormatted(filesToCheck, {
            config,
            root: baseDir,
          });

          if (result.pass) {
            pass(result.message());
          } else {
            fail(result.message());
          }
        },
      );
    };

    return { prettier: api };
  };
};

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
