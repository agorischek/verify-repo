import { existsSync } from "fs";
import * as path from "path";

export const matchers = {
  async toExistAsFile(filePath: string, root?: string) {
    const baseDir = root || process.cwd();
    const fullPath = path.resolve(baseDir, filePath);
    const pass = existsSync(fullPath);
    return {
      pass,
      message: () =>
        pass
          ? `File "${filePath}" exists.`
          : `Expected file "${filePath}" to exist, but it was not found at ${fullPath}.`,
    };
  },
};
