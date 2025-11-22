import { FilePluginApi } from './types';
import { PluginContext } from '@repo-tests/core';
import { fileMatchers } from './matchers';

// Module augmentation to add 'file' to RepoTests
declare module '@repo-tests/core' {
  interface RepoTestsExtensions {
    file: (filePath: string) => FilePluginApi;
  }
}

export const file = () => {
  return ({ test, expect, root }: PluginContext) => {
    expect.extend(fileMatchers);
    const api = function file(filePath: string): FilePluginApi {
      return {
        exists() {
          test(`file: ${filePath} exists`, () => {
             expect(filePath).toExistAsFile(root);
          });
        }
      };
    };
    return { file: api };
  };
}
