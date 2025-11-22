import { spawn } from 'child_process';
import { ScriptPluginApi } from './types';

// Module augmentation to add 'script' to RepoTests
declare module '@repo-tests/core' {
  interface RepoTestsExtensions {
    script: (name: string) => ScriptPluginApi;
  }
}

export function scripts() {
  return {
    name: "script",
    create({ test, expect }: any) {
      const api = function script(name: string): ScriptPluginApi {
        return {
          runs() {
            test(`script: ${name} runs`, async () => {
              const { exitCode, stdout, stderr } = await runScript(name);
              expect({ exitCode, stdout, stderr }).toHaveScriptSucceeded();
            });
          },
          outputs(regex: RegExp) {
            test(`script: ${name} boots when ${regex}`, async () => {
              const { stdout, stderr } = await runScriptStreaming(name, {
                timeout: 15000
              });
              expect(stdout).toContainLineMatching(regex);
            });
          }
        };
      };
      return api;
    },
    matchers: {
      toHaveScriptSucceeded(received: any) {
        const pass = received.exitCode === 0;
        return {
          pass,
          message: () =>
            pass
              ? "Expected script to fail but it succeeded"
              : `Script exited with ${received.exitCode}\nSTDOUT:\n${received.stdout}\nSTDERR:\n${received.stderr}`
        };
      },
      toContainLineMatching(output: string, regex: RegExp) {
        const lines = output.split(/\r?\n/);
        const matched = lines.find((line: string) => regex.test(line));
        const pass = Boolean(matched);
        return {
          pass,
          message: () =>
            pass
              ? `Expected output not to match ${regex}, but it did`
              : `Expected output to contain a matching line: ${regex}\n\nOutput:\n${output}`
        };
      }
    }
  };
}

// Helper to run a script and wait for it to finish
function runScript(name: string): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    // Assuming 'npm run <name>'
    const child = spawn('npm', ['run', name], { 
        shell: true,
        // env: { ...process.env, CI: 'true' } 
    });
    
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => { stdout += data.toString(); });
    child.stderr?.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      resolve({ exitCode: code, stdout, stderr });
    });

    child.on('error', (err) => {
        stderr += `Failed to start subprocess: ${err.message}`;
        resolve({ exitCode: 1, stdout, stderr });
    });
  });
}

// Helper to run a script streaming/with timeout
function runScriptStreaming(name: string, options: { timeout: number }): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', name], { shell: true });
    
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => { stdout += data.toString(); });
    child.stderr?.on('data', (data) => { stderr += data.toString(); });

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

    child.on('close', () => {
        clearTimeout(timer);
        finish();
    });

    child.on('error', (err) => {
        clearTimeout(timer);
        stderr += `Failed to start subprocess: ${err.message}`;
        finish();
    });
  });
}
