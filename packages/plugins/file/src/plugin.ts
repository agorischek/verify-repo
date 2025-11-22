import { FilePluginApi } from "./types";
import { PluginContext } from "@repo-tests/core";
import { matchers } from "./matchers";

export const file = () => {
  return ({ schedule, root }: PluginContext) => {
    const api = function file(filePath: string): FilePluginApi {
      return {
        exists() {
          schedule(`"${filePath}" file should exist`, async ({ pass, fail }) => {
            const result = await matchers.toExistAsFile(filePath, root);
            if (result.pass) {
              pass(result.message());
            } else {
              fail(result.message());
            }
          });
        },
      };
    };
    return { file: api };
  };
};
