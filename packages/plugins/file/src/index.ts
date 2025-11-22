import { existsSync } from 'fs';
import * as path from 'path';
import { FilePluginApi } from './types';

// Module augmentation to add 'file' to RepoTests
declare module '@repo-tests/core' {
  interface RepoTestsExtensions {
    file: (filePath: string) => FilePluginApi;
  }
}

export function file() {
  return {
    name: "file",
    create({ test, expect }: any) {
      const api = function file(filePath: string): FilePluginApi {
        return {
          exists() {
            test(`file: ${filePath} exists`, () => {
               expect(filePath).toExistAsFile();
            });
          }
        };
      };
      return api;
    },
    matchers: {
      toExistAsFile(filePath: string) {
        const fullPath = path.resolve(process.cwd(), filePath);
        const pass = existsSync(fullPath);
        return {
          pass,
          message: () => pass
            ? `Expected file "${filePath}" not to exist, but it does.`
            : `Expected file "${filePath}" to exist, but it was not found at ${fullPath}.`
        };
      }
    }
  };
}
