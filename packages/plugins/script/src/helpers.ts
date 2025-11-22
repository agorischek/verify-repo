import { spawn, ChildProcess } from "child_process";
import { Readable } from "stream";

// Helper to run a script and wait for it to finish
export function runScript(
  name: string,
  root?: string,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    // Assuming 'npm run <name>'
    const child = spawn("npm", ["run", name], {
      shell: true,
      cwd: root || process.cwd(),
      // env: { ...process.env, CI: 'true' }
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ exitCode: code, stdout, stderr });
    });

    child.on("error", (err) => {
      stderr += `Failed to start subprocess: ${err.message}`;
      resolve({ exitCode: 1, stdout, stderr });
    });
  });
}

// Helper to run a script streaming/with timeout
export function runScriptStreaming(
  name: string,
  options: { timeout: number; root?: string },
): Promise<{
  child: ChildProcess;
  stdout: Readable | null;
  stderr: Readable | null;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", name], {
      shell: true,
      cwd: options.root || process.cwd(),
    });

    child.on("error", (err) => {
      reject(err);
    });

    // Resolve immediately with the streams - the matcher will handle timeout
    resolve({
      child,
      stdout: child.stdout,
      stderr: child.stderr,
    });
  });
}
