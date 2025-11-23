import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function checkFileExists(filePath: string, root?: string) {
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
      message: () => `Expected file "${filePath}" to exist, but it was not found at ${fullPath}.`,
    };
  }
}

export async function checkFileContains(filePath: string, needle: string | RegExp, root?: string) {
  const baseDir = root || process.cwd();
  const fullPath = path.resolve(baseDir, filePath);
  try {
    const contents = await readFile(fullPath, "utf8");
    const pass = typeof needle === "string" ? contents.includes(needle) : needle.test(contents);
    const printableNeedle = typeof needle === "string" ? `"${needle}"` : needle.toString();

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
      message: () => `Failed to read "${filePath}" while searching for ${String(needle)}: ${(error as Error).message}`,
    };
  }
}

export async function checkDirExists(dirPath: string, root?: string) {
  const baseDir = root || process.cwd();
  const fullPath = path.resolve(baseDir, dirPath);
  try {
    const stats = await stat(fullPath);
    if (stats.isDirectory()) {
      return {
        pass: true,
        message: () => `Directory "${dirPath}" exists.`,
      };
    } else {
      return {
        pass: false,
        message: () => `Expected directory "${dirPath}" to exist, but "${fullPath}" is not a directory.`,
      };
    }
  } catch {
    return {
      pass: false,
      message: () => `Expected directory "${dirPath}" to exist, but it was not found at ${fullPath}.`,
    };
  }
}
