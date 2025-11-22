import { ScriptPluginApi } from "./types";
import { PluginContext } from "@repo-tests/core";
import { matchers } from "./matchers";
import { runScript, runScriptStreaming } from "./helpers";

export const script = () => {
  return ({ schedule, root }: PluginContext) => {
    const api = function script(name: string): ScriptPluginApi {
      return {
        runs() {
          schedule(
            `"${name}" script should run successfully`,
            async ({ pass, fail }) => {
              const { exitCode, stdout, stderr } = await runScript(name, root);
              const result = await matchers.toHaveScriptSucceeded({
                exitCode,
                stdout,
                stderr,
              });
              if (result.pass) {
                pass(result.message());
              } else {
                fail(result.message());
              }
            },
          );
        },
        outputs(regex: RegExp) {
          schedule(
            `"${name}" script output should match ${regex}`,
            async ({ pass, fail }) => {
              const { child, stdout } = await runScriptStreaming(name, {
                timeout: 15000,
                root,
              });

              try {
                if (!stdout) {
                  throw new Error("stdout stream is not available");
                }

                const result = await matchers.toContainLineMatching(
                  stdout,
                  regex,
                  15000,
                );

                if (result.pass) {
                  pass(result.message());
                } else {
                  fail(result.message());
                }
              } catch (error) {
                fail(
                  `Failed to validate output from "${name}" against ${regex}`,
                  error,
                );
              } finally {
                if (child.exitCode === null) {
                  child.kill();
                }
              }
            },
          );
        },
      };
    };
    return { script: api };
  };
};
