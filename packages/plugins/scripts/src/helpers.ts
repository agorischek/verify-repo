import { spawn } from "child_process";

// Helper to run a script and wait for it to finish
export function runScript(
  name: string,
  root?: string
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
  options: { timeout: number; root?: string }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("npm", ["run", name], {
      shell: true,
      cwd: options.root || process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (child.exitCode === null) {
        child.kill();
      }
      resolve({ stdout, stderr });
    };

    const timer = setTimeout(finish, options.timeout);

    child.on("close", () => {
      clearTimeout(timer);
      finish();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      stderr += `Failed to start subprocess: ${err.message}`;
      finish();
    });
  });
}

