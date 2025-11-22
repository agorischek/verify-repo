import { FilePluginApi } from './types';
import { PluginContext } from '@repo-tests/core';
import { fileMatchers } from './matchers';

export const file = () => {
  return ({ test, expect, root }: PluginContext) => {
    expect.extend(fileMatchers);
    const api = function file(filePath: string): FilePluginApi {
      return {
        exists() {
          test(`file: ${filePath} exists`, async () => {
             await expect(filePath).toExistAsFile(root);
          });
        }
      };
    };
    return { file: api };
  };
}

