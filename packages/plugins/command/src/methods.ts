import type { VerificationContext } from "@verify-repo/engine";
import { checkOutputContainsLine } from "./checks";
import { runCommand, runCommandStreaming, type CommandRunOptions as InternalRunOptions } from "./helpers";
import type { CommandRunOptions, CommandOutputOptions } from "./types";

export function createCommandMethods(context: VerificationContext, commandText: string, scriptName?: string) {
  const isScript = scriptName !== undefined;
  const displayName = isScript ? scriptName : commandText;
  const entityType = isScript ? "Script" : "Command";

  return {
    runs: (options?: CommandRunOptions) => {
      const description = `${entityType} "${displayName}" should run successfully`;
      context.register(description, async () => {
        try {
          const result = await runCommand(commandText, deriveRunOptions(context.dir, options));
          const expected = options?.expectExitCode ?? 0;
          if (result.exitCode === expected) {
            return {
              pass: true,
              message:
                expected === 0
                  ? `${entityType} "${displayName}" exited successfully.`
                  : `${entityType} "${displayName}" exited with expected code ${expected}.`,
            };
          } else {
            return {
              pass: false,
              message: `${entityType} "${displayName}" exited with ${result.exitCode}. Expected ${expected}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
            };
          }
        } catch (error) {
          return { pass: false, message: `Failed to run "${displayName}"`, error };
        }
      });
    },
    outputs: (regex: RegExp, options?: CommandOutputOptions) => {
      const description = `${entityType} "${displayName}" output should match ${regex}`;
      context.register(description, async () => {
        try {
          const { child, stdout } = await runCommandStreaming(commandText, {
            dir: options?.dir ?? context.dir,
            env: options?.env,
          });

          try {
            if (!stdout) {
              return { pass: false, message: `${entityType} stdout stream is not available.` };
            }

            const timeout = options?.timeoutMs ?? 15000;
            const result = await checkOutputContainsLine(stdout, regex, timeout);

            return { pass: result.pass, message: result.message() };
          } finally {
            if (child.exitCode === null) {
              child.kill();
            }
          }
        } catch (error) {
          return { pass: false, message: `Failed to validate output from "${displayName}" against ${regex}`, error };
        }
      });
    },
  };
}

function deriveRunOptions(root: string | undefined, options?: CommandRunOptions): InternalRunOptions {
  return {
    dir: options?.dir ?? root,
    env: options?.env,
    timeoutMs: options?.timeoutMs,
  };
}
