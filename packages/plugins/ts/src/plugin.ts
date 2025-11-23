import {
  PluginContext,
  PluginEntry,
  type RepoPlugin,
  type VerificationBuilder,
} from "@verify-repo/engine";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import type { TsCheckOptions, TsPluginApi } from "./types";

const require = createRequire(import.meta.url);

export const ts = (): RepoPlugin => ({
  name: "TypeScript",
  description: "Run the TypeScript compiler in different modes.",
  docs: [
    {
      signature: "verify.ts.noErrors(options?)",
      description: "Runs `tsc --noEmit` to confirm there are no type errors.",
    },
    {
      signature: "verify.ts.builds(options?)",
      description: "Runs `tsc` with emit enabled to ensure the project builds.",
    },
    {
      signature: 'verify.ts.buildsProject("<tsconfig>", options?)',
      description: "Targets a specific tsconfig file via `tsc -p`.",
    },
  ],
  api(_context: PluginContext) {
    return {
      ts(builder: VerificationBuilder) {
        return new PluginEntry(builder, {
          noErrors: (_builder: VerificationBuilder, options?: TsCheckOptions) =>
            scheduleTsc(
              _builder,
              ["--noEmit", "--pretty", "false"],
              "TypeScript should have no errors",
              options,
            ),
          builds: (_builder: VerificationBuilder, options?: TsCheckOptions) =>
            scheduleTsc(
              _builder,
              ["--pretty", "false"],
              "TypeScript project should build",
              options,
            ),
          buildsProject: (
            _builder: VerificationBuilder,
            tsconfigPath: string,
            options?: TsCheckOptions,
          ) =>
            scheduleTsc(
              _builder,
              ["-p", tsconfigPath, "--pretty", "false"],
              `TypeScript project "${tsconfigPath}" should build`,
              options,
            ),
        }) as TsPluginApi;
      },
    };
  },
});

function scheduleTsc(
  builder: VerificationBuilder,
  args: string[],
  description: string,
  options?: TsCheckOptions,
) {
  builder.schedule(description, async ({ pass, fail }) => {
    try {
      const cwd = options?.cwd ?? builder.cwd;
      const result = await runTsc(args, { cwd, timeoutMs: options?.timeoutMs });
      if (result.exitCode === 0) {
        pass("TypeScript completed successfully.");
      } else {
        fail(
          `tsc exited with ${result.exitCode}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
        );
      }
    } catch (error) {
      fail("Failed to run the TypeScript compiler.", error);
    }
  });
}

function resolveTscBinary(cwd: string) {
  const searchPaths = [cwd, process.cwd()];
  for (const base of searchPaths) {
    try {
      return require.resolve("typescript/bin/tsc", { paths: [base] });
    } catch {
      // continue
    }
  }
  throw new Error(
    'Could not find the TypeScript compiler. Install "typescript" in your project.',
  );
}

async function runTsc(
  args: string[],
  options: { cwd: string; timeoutMs?: number },
) {
  const tscPath = resolveTscBinary(options.cwd);
  return new Promise<{
    exitCode: number | null;
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const child = spawn(process.execPath, [tscPath, ...args], {
      cwd: options.cwd,
      env: process.env,
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
      if (timer) clearTimeout(timer);
      reject(error);
    });

    child.on("close", (exitCode) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        reject(
          new Error(
            `tsc timed out after ${options.timeoutMs}ms while running in ${options.cwd}`,
          ),
        );
        return;
      }
      resolve({ exitCode, stdout, stderr });
    });
  });
}
