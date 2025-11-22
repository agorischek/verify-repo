import { PrettierPluginApi } from "./types";
import { PluginContext } from "@repo-tests/core";
import { glob } from "glob";
import prettierModule from "prettier";
import { matchers } from "./matchers";


export const prettier = () => {
  return ({ test, expect, root }: PluginContext) => {
    expect.extend(matchers);

    const api: PrettierPluginApi = function prettier(globPattern?: string) {
      test(
        globPattern
          ? `prettier: files matching "${globPattern}" should be formatted`
          : "prettier: all files should be formatted",
        async () => {
          const baseDir = root || process.cwd();

          // Get Prettier config
          const configFile = await prettierModule.resolveConfigFile(baseDir);
          const config = configFile
            ? await prettierModule.resolveConfig(configFile)
            : null;

          // Determine which files to check
          let filesToCheck: string[];

          if (globPattern) {
            // Use provided glob pattern
            filesToCheck = await glob(globPattern, {
              cwd: baseDir,
              absolute: true,
              ignore: [
                "**/node_modules/**",
                "**/dist/**",
                "**/build/**",
                "**/.git/**",
              ],
            });
          } else {
            // Check all files that Prettier would normally format
            // Default patterns from Prettier
            const defaultPatterns = [
              "**/*.{js,jsx,ts,tsx,json,css,scss,less,html,md,mdx,yml,yaml,graphql,gql}",
            ];

            filesToCheck = [];
            for (const pattern of defaultPatterns) {
              const matches = await glob(pattern, {
                cwd: baseDir,
                absolute: true,
                ignore: [
                  "**/node_modules/**",
                  "**/dist/**",
                  "**/build/**",
                  "**/.git/**",
                ],
              });
              filesToCheck.push(...matches);
            }

            // Remove duplicates
            filesToCheck = [...new Set(filesToCheck)];
          }

          await expect(filesToCheck).toBePrettierFormatted({
            config,
            root: baseDir,
          });
        },
      );
    };

    return { prettier: api };
  };
};
