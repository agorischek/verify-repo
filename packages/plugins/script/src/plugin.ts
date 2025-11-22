import { ScriptPluginApi } from "./types";
import { PluginContext } from "@repo-tests/core";
import { matchers } from "./matchers";
import { runScript, runScriptStreaming } from "./helpers";

export const script = () => {
  return ({ test, expect, root }: PluginContext) => {
    expect.extend(matchers);
    const api = function script(name: string): ScriptPluginApi {
      return {
        runs() {
          test(`"${name}" script should run successfully`, async () => {
            const { exitCode, stdout, stderr } = await runScript(name, root);
            await expect({ exitCode, stdout, stderr }).toHaveScriptSucceeded();
          });
        },
        outputs(regex: RegExp) {
          test(`"${name}" script output should match ${regex}`, async () => {
            const { child, stdout, stderr } = await runScriptStreaming(name, {
              timeout: 15000,
              root,
            });

            try {
              if (!stdout) {
                throw new Error("stdout stream is not available");
              }
              await expect(stdout).toContainLineMatching(regex, 15000);
            } finally {
              // Clean up the process if it's still running
              if (child.exitCode === null) {
                child.kill();
              }
            }
          });
        },
      };
    };
    return { script: api };
  };
};
