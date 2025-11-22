import { ScriptPluginApi } from "./types";
import { PluginContext } from "@repo-tests/core";
import { scriptMatchers } from "./matchers";
import { runScript, runScriptStreaming } from "./helpers";

export const scripts = () => {
  return ({ test, expect, root }: PluginContext) => {
    expect.extend(scriptMatchers);
    const api = function script(name: string): ScriptPluginApi {
      return {
        runs() {
          test(`script: ${name} runs`, async () => {
            const { exitCode, stdout, stderr } = await runScript(name, root);
            await expect({ exitCode, stdout, stderr }).toHaveScriptSucceeded();
          });
        },
        outputs(regex: RegExp) {
          test(`script: ${name} boots when ${regex}`, async () => {
            const { stdout, stderr } = await runScriptStreaming(name, {
              timeout: 15000,
              root,
            });
            await expect(stdout).toContainLineMatching(regex);
          });
        },
      };
    };
    return { script: api };
  };
};

