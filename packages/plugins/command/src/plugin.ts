import {
  PluginContext,
  createPluginEntry,
  type VerificationBuilder,
} from "@repo-tests/core";
import { matchers } from "./matchers";
import {
  runCommand,
  runCommandStreaming,
  type CommandRunOptions as InternalRunOptions,
} from "./helpers";
import type {
  CommandPluginApi,
  CommandRunOptions,
  CommandOutputOptions,
} from "./types";

type CommandEntrypoint = ((command: string) => CommandPluginApi) &
  CommandPluginApi;

export const command = () => {
  return ({ root }: PluginContext) => {
    const buildEntry = (
      builder: VerificationBuilder,
      commandText?: string,
    ): CommandEntrypoint => {
      const entry = createPluginEntry(
        builder,
        commandText ? createCommandMethods(builder, commandText, root) : {},
        commandText
          ? undefined
          : (parent, cmd: string) =>
              buildEntry(parent.createChild({ command: cmd }), cmd),
      ) as CommandEntrypoint;

      if (!commandText) {
        entry.runs = (cmd: string, options?: CommandRunOptions) => {
          const child = builder.createChild({ command: cmd });
          buildEntry(child, cmd).runs(options);
        };
        entry.outputs = (
          cmd: string,
          regex: RegExp,
          options?: CommandOutputOptions,
        ) => {
          const child = builder.createChild({ command: cmd });
          buildEntry(child, cmd).outputs(regex, options);
        };
      }

      return entry;
    };

    return {
      command(builder) {
        return buildEntry(builder);
      },
    };
  };
};

function createCommandMethods(
  builder: VerificationBuilder,
  commandText: string,
  root?: string,
) {
  return {
    runs: (_builder: VerificationBuilder, options?: CommandRunOptions) => {
      const description = `Command "${commandText}" should run successfully`;
      builder.schedule(description, async ({ pass, fail }) => {
        try {
          const result = await runCommand(
            commandText,
            deriveRunOptions(root, options),
          );
          const expected = options?.expectExitCode ?? 0;
          if (result.exitCode === expected) {
            pass(
              expected === 0
                ? `Command "${commandText}" exited successfully.`
                : `Command "${commandText}" exited with expected code ${expected}.`,
            );
          } else {
            fail(
              `Command "${commandText}" exited with ${result.exitCode}. Expected ${expected}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
            );
          }
        } catch (error) {
          fail(`Failed to run "${commandText}"`, error);
        }
      });
    },
    outputs: (
      _builder: VerificationBuilder,
      regex: RegExp,
      options?: CommandOutputOptions,
    ) => {
      const description = `Command "${commandText}" output should match ${regex}`;
      builder.schedule(description, async ({ pass, fail }) => {
        try {
          const { child, stdout } = await runCommandStreaming(commandText, {
            cwd: options?.cwd ?? root,
            env: options?.env,
          });

          try {
            if (!stdout) {
              fail("Command stdout stream is not available.");
              return;
            }

            const timeout = options?.timeoutMs ?? 15000;
            const result = await matchers.toContainLineMatching(
              stdout,
              regex,
              timeout,
            );

            if (result.pass) {
              pass(result.message());
            } else {
              fail(result.message());
            }
          } finally {
            if (child.exitCode === null) {
              child.kill();
            }
          }
        } catch (error) {
          fail(
            `Failed to validate output from "${commandText}" against ${regex}`,
            error,
          );
        }
      });
    },
  };
}

function deriveRunOptions(
  root: string | undefined,
  options?: CommandRunOptions,
): InternalRunOptions {
  return {
    cwd: options?.cwd ?? root,
    env: options?.env,
    timeoutMs: options?.timeoutMs,
  };
}
