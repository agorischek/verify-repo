import { spawn, ChildProcess } from "node:child_process";
import { Readable } from "node:stream";

export interface CommandRunOptions {
  dir?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export interface CommandRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export function runCommand(command: string, options: CommandRunOptions = {}): Promise<CommandRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      cwd: options.dir ?? process.cwd(),
      env: { ...process.env, ...options.env },
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

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      if (timer) {
        clearTimeout(timer);
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (timer) {
        clearTimeout(timer);
      }
      if (timedOut) {
        reject(new Error(`Command "${command}" timed out after ${options.timeoutMs}ms.`));
        return;
      }
      resolve({ exitCode: code, stdout, stderr });
    });
  });
}

export interface StreamingOptions {
  dir?: string;
  env?: NodeJS.ProcessEnv;
}

export function runCommandStreaming(
  command: string,
  options: StreamingOptions = {},
): Promise<{
  child: ChildProcess;
  stdout: Readable | null;
  stderr: Readable | null;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      cwd: options.dir ?? process.cwd(),
      env: { ...process.env, ...options.env },
    });

    child.on("error", (error) => {
      reject(error);
    });

    resolve({
      child,
      stdout: child.stdout,
      stderr: child.stderr,
    });
  });
}
