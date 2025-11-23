import {
  PluginContext,
  createPluginEntry,
  type RepoPlugin,
  type VerificationBuilder,
} from "@verify-repo/engine";
import { spawn } from "node:child_process";
import type { DockerBuildOptions, DockerPluginApi } from "./types";

export const docker = (): RepoPlugin => ({
  docs: {
    name: "Docker",
    description:
      "Run `docker build` with optional tags, args, and custom contexts.",
    entries: [
      {
        signature: 'verify.docker.builds("Dockerfile", options?)',
        description:
          "Shortcut that sets the dockerfile path, then applies any additional build options (context, tag, args, buildArgs, cwd, timeoutMs).",
      },
      {
        signature: "verify.docker.builds(options)",
        description:
          "Takes a full options object to describe the build and passes when `docker build` exits successfully.",
      },
    ],
  },
  api(_context: PluginContext) {
    return {
      docker(builder: VerificationBuilder) {
        return createPluginEntry(builder, {
          builds: (
            _builder: VerificationBuilder,
            dockerfileOrOptions?: string | DockerBuildOptions,
            explicitOptions?: DockerBuildOptions,
          ) => {
            const normalized = normalizeOptions(
              builder.cwd,
              dockerfileOrOptions,
              explicitOptions,
            );
            scheduleDockerBuild(_builder, normalized);
          },
        }) as DockerPluginApi;
      },
    };
  },
});

interface NormalizedDockerOptions {
  dockerfile?: string;
  context: string;
  tag?: string;
  args: string[];
  buildArgs: Record<string, string>;
  cwd: string;
  timeoutMs?: number;
}

function normalizeOptions(
  cwd: string,
  dockerfileOrOptions?: string | DockerBuildOptions,
  explicitOptions?: DockerBuildOptions,
): NormalizedDockerOptions {
  let options: DockerBuildOptions =
    typeof dockerfileOrOptions === "string"
      ? { dockerfile: dockerfileOrOptions, ...explicitOptions }
      : { ...(dockerfileOrOptions ?? {}), ...(explicitOptions ?? {}) };

  return {
    dockerfile: options.dockerfile,
    context: options.context ?? ".",
    tag: options.tag,
    args: options.args ?? [],
    buildArgs: options.buildArgs ?? {},
    cwd: options.cwd ?? cwd,
    timeoutMs: options.timeoutMs,
  };
}

function scheduleDockerBuild(
  builder: VerificationBuilder,
  options: NormalizedDockerOptions,
) {
  const description = options.dockerfile
    ? `Dockerfile "${options.dockerfile}" should build`
    : "Docker image should build";

  builder.schedule(description, async ({ pass, fail }) => {
    const args = buildDockerArgs(options);
    try {
      const result = await runDockerBuild(args, {
        cwd: options.cwd,
        timeoutMs: options.timeoutMs,
      });
      if (result.exitCode === 0) {
        pass("Docker build completed successfully.");
      } else {
        fail(
          `docker build exited with ${result.exitCode}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
        );
      }
    } catch (error) {
      fail("Failed to run docker build.", error);
    }
  });
}

function buildDockerArgs(options: NormalizedDockerOptions) {
  const args = ["build"];
  if (options.tag) {
    args.push("-t", options.tag);
  }
  if (options.dockerfile) {
    args.push("-f", options.dockerfile);
  }
  for (const [key, value] of Object.entries(options.buildArgs)) {
    args.push("--build-arg", `${key}=${value}`);
  }
  if (options.args.length > 0) {
    args.push(...options.args);
  }
  args.push(options.context);
  return args;
}

async function runDockerBuild(
  args: string[],
  options: { cwd: string; timeoutMs?: number },
) {
  return new Promise<{
    exitCode: number | null;
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const child = spawn("docker", args, {
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
            `docker build timed out after ${options.timeoutMs}ms while running in ${options.cwd}`,
          ),
        );
        return;
      }
      resolve({ exitCode, stdout, stderr });
    });
  });
}
