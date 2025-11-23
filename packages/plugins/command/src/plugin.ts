import {
  PluginContext,
  createPluginEntry,
  type RepoPlugin,
  type VerificationBuilder,
} from "@verify-repo/engine";
import { checkOutputContainsLine } from "./checks";
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

type CommandLeaf = CommandPluginApi;

interface CommandRoot {
  (command: string): CommandLeaf;
  runs(cmd: string, options?: CommandRunOptions): void;
  outputs(cmd: string, regex: RegExp, options?: CommandOutputOptions): void;
}

type CommandEntrypoint = CommandRoot | CommandLeaf;

type ScriptsLeaf = CommandPluginApi;

interface ScriptsRoot {
  (script: string): ScriptsLeaf;
  runs(script: string, options?: CommandRunOptions): void;
  outputs(script: string, regex: RegExp, options?: CommandOutputOptions): void;
}

type ScriptsEntrypoint = ScriptsRoot | ScriptsLeaf;

function getPackageManagerCommand(
  packageManager: "npm" | "yarn" | "pnpm" | "bun" = "npm",
  script: string,
): string {
  switch (packageManager) {
    case "npm":
      return `npm run ${script}`;
    case "yarn":
      return `yarn ${script}`;
    case "pnpm":
      return `pnpm run ${script}`;
    case "bun":
      return `bun run ${script}`;
  }
}

export const command = (): RepoPlugin => ({
  docs: {
    name: "Command runner",
    description:
      "Execute shell commands and assert on exit codes or streamed output.",
    entries: [
      {
        signature: 'verify.command("<cmd>").runs(options?)',
        description:
          "Runs the command and expects the configured exit code (default 0). Options support cwd, env, timeoutMs, and expectExitCode.",
      },
      {
        signature: 'verify.command("<cmd>").outputs(/pattern/, options?)',
        description:
          "Streams stdout and resolves when the provided RegExp matches before the optional timeout (default 15s). Options support cwd, env, and timeoutMs.",
      },
      {
        signature: 'verify.command.runs("<cmd>", options?)',
        description:
          "Shortcut that schedules a .runs() check without creating an intermediate chain.",
      },
      {
        signature: 'verify.command.outputs("<cmd>", /pattern/, options?)',
        description: "Shortcut that schedules an output check in one call.",
      },
      {
        signature: 'verify.scripts("<script>").runs(options?)',
        description:
          "Runs the npm/yarn/pnpm/bun script and expects the configured exit code (default 0). Uses the packageManager configured in verify.config.ts (default npm). Options support cwd, env, timeoutMs, and expectExitCode.",
      },
      {
        signature: 'verify.scripts("<script>").outputs(/pattern/, options?)',
        description:
          "Streams stdout from the npm/yarn/pnpm/bun script and resolves when the provided RegExp matches before the optional timeout (default 15s). Uses the packageManager configured in verify.config.ts (default npm). Options support cwd, env, and timeoutMs.",
      },
      {
        signature: 'verify.scripts.runs("<script>", options?)',
        description:
          "Shortcut that schedules a .runs() check for a script without creating an intermediate chain.",
      },
      {
        signature: 'verify.scripts.outputs("<script>", /pattern/, options?)',
        description:
          "Shortcut that schedules an output check for a script in one call.",
      },
    ],
  },
  api(context: PluginContext) {
    const buildEntry = (
      builder: VerificationBuilder,
      commandText?: string,
    ): CommandEntrypoint => {
      if (commandText) {
        return createPluginEntry(
          builder,
          createCommandMethods(builder, commandText),
          undefined,
        ) as CommandLeaf;
      }

      const baseEntry = createPluginEntry(
        builder,
        {},
        (parent: VerificationBuilder, cmd: string) =>
          buildEntry(parent.createChild({ command: cmd }), cmd) as CommandLeaf,
      );

      const rootEntry = Object.assign(baseEntry, {
        runs: (cmd: string, options?: CommandRunOptions) => {
          const child = builder.createChild({ command: cmd });
          (buildEntry(child, cmd) as CommandLeaf).runs(options);
        },
        outputs: (
          cmd: string,
          regex: RegExp,
          options?: CommandOutputOptions,
        ) => {
          const child = builder.createChild({ command: cmd });
          (buildEntry(child, cmd) as CommandLeaf).outputs(regex, options);
        },
      });

      return rootEntry as CommandRoot;
    };

    const buildScriptsEntry = (
      builder: VerificationBuilder,
      scriptName?: string,
    ): ScriptsEntrypoint => {
      const packageManager = context.packageManager ?? "npm";

      if (scriptName) {
        const commandText = getPackageManagerCommand(
          packageManager,
          scriptName,
        );
        return createPluginEntry(
          builder,
          createCommandMethods(builder, commandText),
          undefined,
        ) as ScriptsLeaf;
      }

      const baseEntry = createPluginEntry(
        builder,
        {},
        (parent: VerificationBuilder, script: string) => {
          const child = parent.createChild({ script });
          const commandText = getPackageManagerCommand(packageManager, script);
          return createPluginEntry(
            child,
            createCommandMethods(child, commandText),
            undefined,
          ) as ScriptsLeaf;
        },
      );

      const rootEntry = Object.assign(baseEntry, {
        runs: (script: string, options?: CommandRunOptions) => {
          const commandText = getPackageManagerCommand(packageManager, script);
          const child = builder.createChild({ script });
          (
            createPluginEntry(
              child,
              createCommandMethods(child, commandText),
              undefined,
            ) as ScriptsLeaf
          ).runs(options);
        },
        outputs: (
          script: string,
          regex: RegExp,
          options?: CommandOutputOptions,
        ) => {
          const commandText = getPackageManagerCommand(packageManager, script);
          const child = builder.createChild({ script });
          (
            createPluginEntry(
              child,
              createCommandMethods(child, commandText),
              undefined,
            ) as ScriptsLeaf
          ).outputs(regex, options);
        },
      });

      return rootEntry as ScriptsRoot;
    };

    return {
      command(builder: VerificationBuilder) {
        return buildEntry(builder);
      },
      scripts(builder: VerificationBuilder) {
        return buildScriptsEntry(builder);
      },
    };
  },
});

function createCommandMethods(
  builder: VerificationBuilder,
  commandText: string,
) {
  return {
    runs: (_builder: VerificationBuilder, options?: CommandRunOptions) => {
      const description = `Command "${commandText}" should run successfully`;
      builder.schedule(description, async ({ pass, fail }) => {
        try {
          const result = await runCommand(
            commandText,
            deriveRunOptions(builder.cwd, options),
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
            cwd: options?.cwd ?? builder.cwd,
            env: options?.env,
          });

          try {
            if (!stdout) {
              fail("Command stdout stream is not available.");
              return;
            }

            const timeout = options?.timeoutMs ?? 15000;
            const result = await checkOutputContainsLine(
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
