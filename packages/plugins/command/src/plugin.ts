import {
  PluginContext,
  PluginEntry,
  type RepoPlugin,
  type VerificationContext,
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

type ScriptLeaf = CommandPluginApi;

interface ScriptRoot {
  (script: string): ScriptLeaf;
  runs(script: string, options?: CommandRunOptions): void;
  outputs(script: string, regex: RegExp, options?: CommandOutputOptions): void;
}

type ScriptEntrypoint = ScriptRoot | ScriptLeaf;

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
  name: "Command runner",
  description:
    "Execute shell commands and assert on exit codes or streamed output.",
  docs: [
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
      signature: 'verify.script("<script>").runs(options?)',
      description:
        "Runs the npm/yarn/pnpm/bun script and expects the configured exit code (default 0). Uses the packageManager configured in verify.config.ts (default npm). Options support cwd, env, timeoutMs, and expectExitCode.",
    },
    {
      signature: 'verify.script("<script>").outputs(/pattern/, options?)',
      description:
        "Streams stdout from the npm/yarn/pnpm/bun script and resolves when the provided RegExp matches before the optional timeout (default 15s). Uses the packageManager configured in verify.config.ts (default npm). Options support cwd, env, and timeoutMs.",
    },
    {
      signature: 'verify.script.runs("<script>", options?)',
      description:
        "Shortcut that schedules a .runs() check for a script without creating an intermediate chain.",
    },
    {
      signature: 'verify.script.outputs("<script>", /pattern/, options?)',
      description:
        "Shortcut that schedules an output check for a script in one call.",
    },
  ],
  api(context: PluginContext) {
    const buildEntry = (
      builder: VerificationContext,
      commandText?: string,
    ): CommandEntrypoint => {
      if (commandText) {
        return new PluginEntry(
          builder,
          createCommandMethods(builder, commandText),
          undefined,
        ) as CommandLeaf;
      }

      const baseEntry = new PluginEntry(
        builder,
        {},
        (parent: VerificationContext, cmd: string) =>
          buildEntry(parent.extend({ command: cmd }), cmd) as CommandLeaf,
      );

      const rootEntry = Object.assign(baseEntry, {
        runs: (cmd: string, options?: CommandRunOptions) => {
          const child = builder.extend({ command: cmd });
          (buildEntry(child, cmd) as CommandLeaf).runs(options);
        },
        outputs: (
          cmd: string,
          regex: RegExp,
          options?: CommandOutputOptions,
        ) => {
          const child = builder.extend({ command: cmd });
          (buildEntry(child, cmd) as CommandLeaf).outputs(regex, options);
        },
      });

      return rootEntry as CommandRoot;
    };

    const buildScriptEntry = (
      builder: VerificationContext,
      scriptName?: string,
    ): ScriptEntrypoint => {
      const packageManager = context.packageManager ?? "npm";

      if (scriptName) {
        const commandText = getPackageManagerCommand(
          packageManager,
          scriptName,
        );
        return new PluginEntry(
          builder,
          createCommandMethods(builder, commandText, scriptName),
          undefined,
        ) as ScriptLeaf;
      }

      const baseEntry = new PluginEntry(
        builder,
        {},
        (parent: VerificationContext, script: string) => {
          const child = parent.extend({ script });
          const commandText = getPackageManagerCommand(packageManager, script);
          return new PluginEntry(
            child,
            createCommandMethods(child, commandText, script),
            undefined,
          ) as ScriptLeaf;
        },
      );

      const rootEntry = Object.assign(baseEntry, {
        runs: (script: string, options?: CommandRunOptions) => {
          const commandText = getPackageManagerCommand(packageManager, script);
          const child = builder.extend({ script });
          (
            new PluginEntry(
              child,
              createCommandMethods(child, commandText, script),
              undefined,
            ) as ScriptLeaf
          ).runs(options);
        },
        outputs: (
          script: string,
          regex: RegExp,
          options?: CommandOutputOptions,
        ) => {
          const commandText = getPackageManagerCommand(packageManager, script);
          const child = builder.extend({ script });
          (
            new PluginEntry(
              child,
              createCommandMethods(child, commandText, script),
              undefined,
            ) as ScriptLeaf
          ).outputs(regex, options);
        },
      });

      return rootEntry as ScriptRoot;
    };

    return {
      command(builder: VerificationContext) {
        return buildEntry(builder);
      },
      script(builder: VerificationContext) {
        return buildScriptEntry(builder);
      },
    };
  },
});

function createCommandMethods(
  context: VerificationContext,
  commandText: string,
  scriptName?: string,
) {
  const isScript = scriptName !== undefined;
  const displayName = isScript ? scriptName : commandText;
  const entityType = isScript ? "Script" : "Command";

  return {
    runs: (options?: CommandRunOptions) => {
      const description = `${entityType} "${displayName}" should run successfully`;
      context.register(description, async ({ pass, fail }) => {
        try {
          const result = await runCommand(
            commandText,
            deriveRunOptions(context.cwd, options),
          );
          const expected = options?.expectExitCode ?? 0;
          if (result.exitCode === expected) {
            pass(
              expected === 0
                ? `${entityType} "${displayName}" exited successfully.`
                : `${entityType} "${displayName}" exited with expected code ${expected}.`,
            );
          } else {
            fail(
              `${entityType} "${displayName}" exited with ${result.exitCode}. Expected ${expected}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
            );
          }
        } catch (error) {
          fail(`Failed to run "${displayName}"`, error);
        }
      });
    },
    outputs: (regex: RegExp, options?: CommandOutputOptions) => {
      const description = `${entityType} "${displayName}" output should match ${regex}`;
      context.register(description, async ({ pass, fail }) => {
        try {
          const { child, stdout } = await runCommandStreaming(commandText, {
            cwd: options?.cwd ?? context.cwd,
            env: options?.env,
          });

          try {
            if (!stdout) {
              fail(`${entityType} stdout stream is not available.`);
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
            `Failed to validate output from "${displayName}" against ${regex}`,
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
