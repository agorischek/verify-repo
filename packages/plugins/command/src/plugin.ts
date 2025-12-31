import { PluginEntry, type PluginOptions, type RepoPlugin, type VerificationContext } from "@verify-repo/engine";
import { checkOutputContainsLine } from "./checks";
import { runCommand, runCommandStreaming, type CommandRunOptions as InternalRunOptions } from "./helpers";
import type { CommandPluginApi, CommandRunOptions, CommandOutputOptions } from "./types";

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

function getPackageManagerCommand(packageManager: "npm" | "yarn" | "pnpm" | "bun" = "npm", script: string): string {
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
  description: "Execute shell commands and assert on exit codes or streamed output.",
  docs: [
    {
      signature: 'verify.command("<cmd>").runs(options?)',
      description:
        "Runs the command and expects the configured exit code (default 0). Options support dir, env, timeoutMs, and expectExitCode.",
    },
    {
      signature: 'verify.command("<cmd>").outputs(/pattern/, options?)',
      description:
        "Streams stdout and resolves when the provided RegExp matches before the optional timeout (default 15s). Options support dir, env, and timeoutMs.",
    },
    {
      signature: 'verify.command.runs("<cmd>", options?)',
      description: "Shortcut that schedules a .runs() check without creating an intermediate chain.",
    },
    {
      signature: 'verify.command.outputs("<cmd>", /pattern/, options?)',
      description: "Shortcut that schedules an output check in one call.",
    },
    {
      signature: 'verify.script("<script>").runs(options?)',
      description:
        "Runs the npm/yarn/pnpm/bun script and expects the configured exit code (default 0). Uses the packageManager configured in verify.config.ts (default npm). Options support dir, env, timeoutMs, and expectExitCode.",
    },
    {
      signature: 'verify.script("<script>").outputs(/pattern/, options?)',
      description:
        "Streams stdout from the npm/yarn/pnpm/bun script and resolves when the provided RegExp matches before the optional timeout (default 15s). Uses the packageManager configured in verify.config.ts (default npm). Options support dir, env, and timeoutMs.",
    },
    {
      signature: 'verify.script.runs("<script>", options?)',
      description: "Shortcut that schedules a .runs() check for a script without creating an intermediate chain.",
    },
    {
      signature: 'verify.script.outputs("<script>", /pattern/, options?)',
      description: "Shortcut that schedules an output check for a script in one call.",
    },
  ],
  api({ packageManager }: PluginOptions) {
    const buildEntry = (context: VerificationContext, commandText?: string): CommandEntrypoint => {
      if (commandText) {
        return context.entry(createCommandMethods(context, commandText)) as CommandLeaf;
      }

      const baseEntry = context.entry(
        {},
        (parent: VerificationContext, cmd: string) => buildEntry(parent.extend({ command: cmd }), cmd) as CommandLeaf,
      );

      const rootEntry = Object.assign(baseEntry, {
        runs: (cmd: string, options?: CommandRunOptions) => {
          const child = context.extend({ command: cmd });
          (buildEntry(child, cmd) as CommandLeaf).runs(options);
        },
        outputs: (cmd: string, regex: RegExp, options?: CommandOutputOptions) => {
          const child = context.extend({ command: cmd });
          (buildEntry(child, cmd) as CommandLeaf).outputs(regex, options);
        },
      });

      return rootEntry as CommandRoot;
    };

    const buildScriptEntry = (context: VerificationContext, scriptName?: string): ScriptEntrypoint => {
      const resolvedPackageManager = packageManager ?? "npm";

      if (scriptName) {
        const commandText = getPackageManagerCommand(resolvedPackageManager, scriptName);
        return context.entry(createCommandMethods(context, commandText, scriptName)) as ScriptLeaf;
      }

      const baseEntry = context.entry({}, (parent: VerificationContext, script: string) => {
        const child = parent.extend({ script });
        const commandText = getPackageManagerCommand(packageManager, script);
        return child.entry(createCommandMethods(child, commandText, script)) as ScriptLeaf;
      });

      const rootEntry = Object.assign(baseEntry, {
        runs: (script: string, options?: CommandRunOptions) => {
          const commandText = getPackageManagerCommand(packageManager, script);
          const child = context.extend({ script });
          (child.entry(createCommandMethods(child, commandText, script)) as ScriptLeaf).runs(options);
        },
        outputs: (script: string, regex: RegExp, options?: CommandOutputOptions) => {
          const commandText = getPackageManagerCommand(packageManager, script);
          const child = context.extend({ script });
          (child.entry(createCommandMethods(child, commandText, script)) as ScriptLeaf).outputs(regex, options);
        },
      });

      return rootEntry as ScriptRoot;
    };

    return {
      command(context: VerificationContext) {
        return buildEntry(context);
      },
      script(context: VerificationContext) {
        return buildScriptEntry(context);
      },
    };
  },
});

function createCommandMethods(context: VerificationContext, commandText: string, scriptName?: string) {
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
