import {
  PluginEntry,
  type PluginContext,
  type RepoPlugin,
  type VerificationContext,
} from "@verify-repo/engine";
import { spawn } from "node:child_process";
import type { BunPluginApi, BunTestApi, BunTestOptions } from "./types";

export const bun = (): RepoPlugin => ({
  name: "Bun",
  description: "Run Bun-powered test suites as part of repo verification.",
  docs: [
    {
      signature: "verify.bun.test.passes(options?)",
      description:
        "Runs `bun test` (optionally with extra CLI args) relative to the verify file directory and expects a zero exit code. Override cwd, env, or timeout via options.",
    },
  ],
  api(_context: PluginContext) {
    return {
      bun(context: VerificationContext) {
        return buildBunEntry(context);
      },
    };
  },
});

function buildBunEntry(context: VerificationContext): BunPluginApi {
  const entry = new PluginEntry(context, {});
  return Object.assign(entry, {
    test: createBunTestEntry(context.extend({ command: "bun test" })),
  }) as BunPluginApi;
}

function createBunTestEntry(context: VerificationContext): BunTestApi {
  return new PluginEntry(
    context,
    {
      passes: (options?: BunTestOptions) => scheduleBunTest(context, options),
    },
    undefined,
  ) as BunTestApi;
}

function scheduleBunTest(
  context: VerificationContext,
  options?: BunTestOptions,
) {
  const cwd = options?.cwd ?? context.cwd;
  const extraArgs = options?.args ?? [];
  const bunArgs = ["test", ...extraArgs];
  const label = formatCommand(bunArgs);

  context.register(`${label} should succeed`, async ({ pass, fail }) => {
    try {
      const result = await runBunCommand(bunArgs, {
        cwd,
        env: options?.env,
        timeoutMs: options?.timeoutMs,
      });

      if (result.exitCode === 0) {
        pass(`"${label}" completed successfully.`);
        return;
      }

      fail(
        `"${label}" exited with ${result.exitCode}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
      );
    } catch (error) {
      fail(`Failed to run "${label}".`, error);
    }
  });
}

function formatCommand(args: string[]) {
  return ["bun", ...args].join(" ");
}

interface BunCommandOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

interface BunCommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

function runBunCommand(
  args: string[],
  options: BunCommandOptions,
): Promise<BunCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("bun", args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer =
      typeof options.timeoutMs === "number"
        ? setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
          }, options.timeoutMs)
        : null;

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (timer) {
        clearTimeout(timer);
      }
      reject(error);
    });

    child.on("close", (exitCode) => {
      if (timer) {
        clearTimeout(timer);
      }

      if (timedOut) {
        reject(
          new Error(
            `"${formatCommand(args)}" timed out after ${options.timeoutMs}ms.`,
          ),
        );
        return;
      }

      resolve({ exitCode, stdout, stderr });
    });
  });
}
