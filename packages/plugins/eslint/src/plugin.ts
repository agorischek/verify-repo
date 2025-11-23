import {
  PluginContext,
  createPluginEntry,
  type RepoPlugin,
  type VerificationBuilder,
} from "@verify-repo/engine";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import type { EslintOptions, EslintPluginApi } from "./types";

const require = createRequire(import.meta.url);

export const eslint = (): RepoPlugin => ({
  docs: {
    name: "ESLint",
    description: "Ensure lint rules pass (optionally fixing files first).",
    entries: [
      {
        signature: "verify.eslint.passes(options?)",
        description:
          "Runs the local ESLint binary. Options support files/globs, cwd, config, maxWarnings, fix, and timeoutMs.",
      },
    ],
  },
  api(_context: PluginContext) {
    return {
      eslint(builder: VerificationBuilder) {
        return createPluginEntry(builder, {
          passes: (_builder: VerificationBuilder, options?: EslintOptions) =>
            scheduleEslint(_builder, options),
        }) as EslintPluginApi;
      },
    };
  },
});

function scheduleEslint(builder: VerificationBuilder, options?: EslintOptions) {
  const files = normalizeFiles(options?.files);
  const description =
    files.length === 1 && files[0] === "."
      ? "ESLint should pass"
      : `ESLint should pass for ${files.join(", ")}`;

  builder.schedule(description, async ({ pass, fail }) => {
    try {
      const cwd = options?.cwd ?? builder.cwd;
      const args = buildEslintArgs(files, options);
      const result = await runEslint(args, {
        cwd,
        timeoutMs: options?.timeoutMs,
      });
      if (result.exitCode === 0) {
        pass("ESLint reported no errors.");
      } else {
        fail(
          `ESLint exited with ${result.exitCode}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
        );
      }
    } catch (error) {
      fail("Failed to run ESLint.", error);
    }
  });
}

function normalizeFiles(files?: string | string[]) {
  if (!files) {
    return ["."];
  }
  return Array.isArray(files) ? files : [files];
}

function buildEslintArgs(files: string[], options?: EslintOptions) {
  const args = [...files];
  if (typeof options?.maxWarnings === "number") {
    args.push("--max-warnings", options.maxWarnings.toString());
  }
  if (options?.config) {
    args.push("--config", options.config);
  }
  if (options?.fix) {
    args.push("--fix");
  }
  return args;
}

function resolveEslintBinary(cwd: string) {
  const searchPaths = [cwd, process.cwd()];
  for (const base of searchPaths) {
    try {
      return require.resolve("eslint/bin/eslint.js", { paths: [base] });
    } catch {
      // continue
    }
  }
  throw new Error(
    'Could not find ESLint. Install "eslint" in your project to use this check.',
  );
}

async function runEslint(
  args: string[],
  options: { cwd: string; timeoutMs?: number },
) {
  const eslintPath = resolveEslintBinary(options.cwd);
  return new Promise<{
    exitCode: number | null;
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const child = spawn(process.execPath, [eslintPath, ...args], {
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
            `ESLint timed out after ${options.timeoutMs}ms while running in ${options.cwd}`,
          ),
        );
        return;
      }
      resolve({ exitCode, stdout, stderr });
    });
  });
}
