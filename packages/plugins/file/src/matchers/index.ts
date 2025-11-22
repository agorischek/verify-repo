import { existsSync } from 'fs';
import * as path from 'path';

export const fileMatchers = {
  toExistAsFile(filePath: string, root?: string) {
    const baseDir = root || process.cwd();
    const fullPath = path.resolve(baseDir, filePath);
    const pass = existsSync(fullPath);
    return {
      pass,
      message: () =>
        pass
          ? `Expected file "${filePath}" not to exist, but it does.`
          : `Expected file "${filePath}" to exist, but it was not found at ${fullPath}.`
    };
  }
};


