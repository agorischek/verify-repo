import { access, readFile } from "node:fs/promises";
import path from "node:path";

export const matchers = {
  async toExistAsFile(filePath: string, root?: string) {
    const baseDir = root || process.cwd();
    const fullPath = path.resolve(baseDir, filePath);
    try {
      await access(fullPath);
      return {
        pass: true,
        message: () => `File "${filePath}" exists.`,
      };
    } catch {
      return {
        pass: false,
        message: () =>
          `Expected file "${filePath}" to exist, but it was not found at ${fullPath}.`,
      };
    }
  },
  async toContainText(
    filePath: string,
    needle: string | RegExp,
    root?: string,
  ) {
    const baseDir = root || process.cwd();
    const fullPath = path.resolve(baseDir, filePath);
    try {
      const contents = await readFile(fullPath, "utf8");
      const pass =
        typeof needle === "string" ? contents.includes(needle) : needle.test(contents);
      const printableNeedle =
        typeof needle === "string" ? `"${needle}"` : needle.toString();

      return {
        pass,
        message: () =>
          pass
            ? `File "${filePath}" contains ${printableNeedle}.`
            : `Expected file "${filePath}" to contain ${printableNeedle}, but it did not.`,
      };
    } catch (error) {
      return {
        pass: false,
        message: () =>
          `Failed to read "${filePath}" while searching for ${String(needle)}: ${
            (error as Error).message
          }`,
      };
    }
  },
};
