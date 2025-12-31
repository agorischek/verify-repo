import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import type { FileLineCountOptions } from "./types";

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

type FileLineCountViolation = {
  file: string;
  lineCount: number;
};

const DEFAULT_IGNORE = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/coverage/**"];

export async function checkFilesLineCount(pattern: string, options: FileLineCountOptions, rootDir: string) {
  const { min, max } = options;
  if (min !== undefined && (!Number.isFinite(min) || min < 0)) {
    return {
      pass: false,
      message: () => `lines().min must be a finite number >= 0. Received: ${String(min)}`,
    };
  }
  if (max !== undefined && (!Number.isFinite(max) || max < 0)) {
    return {
      pass: false,
      message: () => `lines().max must be a finite number >= 0. Received: ${String(max)}`,
    };
  }
  if (min !== undefined && max !== undefined && min > max) {
    return {
      pass: false,
      message: () => `lines().min cannot be greater than lines().max. Received: min=${min}, max=${max}`,
    };
  }

  const matchedFiles = await glob(pattern, {
    cwd: rootDir,
    nodir: true,
    ignore: DEFAULT_IGNORE,
  });

  if (matchedFiles.length === 0) {
    return {
      pass: false,
      message: () => `No files matched "${pattern}" under ${rootDir}.`,
    };
  }

  const violations: FileLineCountViolation[] = [];
  for (const file of matchedFiles) {
    const fullPath = path.join(rootDir, file);
    let contents: string;
    try {
      contents = await readFile(fullPath, "utf8");
    } catch (error) {
      return {
        pass: false,
        message: () => `Failed to read "${file}": ${(error as Error).message}`,
      };
    }

    const lineCount = contents.split("\n").length;
    const tooFew = min !== undefined && lineCount < min;
    const tooMany = max !== undefined && lineCount > max;

    if (tooFew || tooMany) {
      violations.push({ file, lineCount });
    }
  }

  const bounds = [min !== undefined ? `min=${min}` : null, max !== undefined ? `max=${max}` : null]
    .filter(Boolean)
    .join(", ");

  if (violations.length === 0) {
    return {
      pass: true,
      message: () =>
        `All ${matchedFiles.length} file${matchedFiles.length === 1 ? "" : "s"} matched by "${pattern}" have line counts within ${bounds}.`,
    };
  }

  const violationList = violations.map((v) => `  - ${v.file} (${v.lineCount} lines)`).join("\n");

  return {
    pass: false,
    message: () =>
      `Found ${violations.length} file${violations.length === 1 ? "" : "s"} with line count outside ${bounds} for "${pattern}":\n${violationList}`,
  };
}
