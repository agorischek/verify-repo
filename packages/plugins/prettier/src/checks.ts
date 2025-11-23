import { readFile } from "fs/promises";
import * as path from "path";
import prettierModule from "prettier";

export async function checkPrettierFormatted(
  files: string[],
  options: { config: prettierModule.Options | null; root: string },
) {
  const { config, root } = options;
  const ignorePath = path.join(root, ".prettierignore");

  // Filter files that Prettier should format
  const filesToFormat = (
    await Promise.all(
      files.map(async (file) => {
        const fileInfo = await prettierModule.getFileInfo(file, {
          ignorePath,
        });
        return { file, fileInfo };
      }),
    )
  ).filter((item) => item.fileInfo.inferredParser !== null);

  if (filesToFormat.length === 0) {
    return {
      pass: true,
      message: () => "No files to check",
    };
  }

  const results = await Promise.all(
    filesToFormat.map(async ({ file }) => {
      const fileContent = await readFile(file, "utf-8");
      const isFormatted = await prettierModule.check(fileContent, {
        ...config,
        filepath: file,
      });

      return isFormatted ? null : path.relative(root, file);
    }),
  );

  const unformattedFiles = results.filter(
    (file): file is string => file !== null,
  );
  const pass = unformattedFiles.length === 0;

  return {
    pass,
    message: () =>
      pass
        ? "All files are formatted"
        : `The following files are not formatted:\n\n${unformattedFiles
            .map((file) => `  ${file}`)
            .join("\n")}\n\nRun prettier --write to fix them.`,
  };
}
