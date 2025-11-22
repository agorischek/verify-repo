import { FilePluginApi } from "./types";
import { PluginContext } from "@repo-tests/core";
import { matchers } from "./matchers";

export const file = () => {
  return ({ test, expect, root }: PluginContext) => {
    expect.extend(matchers);
    const api = function file(filePath: string): FilePluginApi {
      return {
        exists() {
          test(`"${filePath}" file should exist`, async () => {
            await expect(filePath).toExistAsFile(root);
          });
        },
      };
    };
    return { file: api };
  };
};
