import { access, readFile, readdir, stat } from "node:fs/promises";
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

export interface FileLineLengthOptions {
  min?: number;
  max?: number;
}

type LineLengthViolation = {
  file: string; // repo-relative, posix-style
  line: number; // 1-based
  length: number;
};

const DEFAULT_IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
  "out",
  "target",
]);

function toPosixPath(p: string) {
  return p.split(path.sep).join("/");
}

async function walkFiles(rootDir: string, dir: string, onFile: (relativePosixPath: string) => void | Promise<void>) {
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (DEFAULT_IGNORED_DIRS.has(entry.name)) {
          return;
        }
        await walkFiles(rootDir, full, onFile);
        return;
      }

      if (!entry.isFile()) {
        return;
      }

      const rel = path.relative(rootDir, full);
      // If outside root, ignore (shouldn't happen, but be defensive).
      if (rel.startsWith("..")) {
        return;
      }
      await onFile(toPosixPath(rel));
    }),
  );
}

export async function checkFilesLineLengths(pattern: RegExp, options: FileLineLengthOptions, rootDir: string) {
  const { min, max } = options;
  if (min === undefined && max === undefined) {
    return {
      pass: false,
      message: () => `lines() requires at least one of { min, max }.`,
    };
  }
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

  const matchedFiles: string[] = [];
  await walkFiles(rootDir, rootDir, async (rel) => {
    if (pattern.test(rel)) {
      matchedFiles.push(rel);
    }
  });

  if (matchedFiles.length === 0) {
    return {
      pass: false,
      message: () => `No files matched ${pattern.toString()} under ${rootDir}.`,
    };
  }

  const violations: LineLengthViolation[] = [];
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

    const lines = contents.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i] ?? "";
      const lineText = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
      const length = lineText.length;
      if ((min !== undefined && length < min) || (max !== undefined && length > max)) {
        violations.push({ file, line: i + 1, length });
        // Keep scanning to collect a few more violations, but don’t explode memory.
        if (violations.length >= 50) {
          break;
        }
      }
    }
    if (violations.length >= 50) {
      break;
    }
  }

  const bounds = [
    min !== undefined ? `min=${min}` : null,
    max !== undefined ? `max=${max}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  if (violations.length === 0) {
    return {
      pass: true,
      message: () =>
        `All lines in ${matchedFiles.length} file${matchedFiles.length === 1 ? "" : "s"} matched by ${pattern.toString()} satisfy ${bounds}.`,
    };
  }

  const preview = violations
    .slice(0, 10)
    .map((v) => `${v.file}:${v.line} (len=${v.length})`)
    .join(", ");

  return {
    pass: false,
    message: () =>
      `Found ${violations.length} line length violation${violations.length === 1 ? "" : "s"} for ${pattern.toString()} (${bounds}). ` +
      `Examples: ${preview}`,
  };
}
