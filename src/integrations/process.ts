import { spawn, exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import type { RepoTests } from "../core";

const execAsync = promisify(exec);

export function createProcessIntegration(repo: RepoTests) {
  const repoRoot = repo.getRepoRoot();

  async function runStreaming(
    command: string,
    options: { timeout?: number; cwd?: string } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(" ");
      const proc = spawn(cmd, args, {
        cwd: options.cwd || repoRoot,
        shell: true,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      const timeout = options.timeout || 10000;
      const timeoutId = setTimeout(() => {
        proc.kill();
        reject(new Error(`Command "${command}" timed out after ${timeout}ms`));
      }, timeout);

      proc.on("close", (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command "${command}" exited with code ${code}\n${stderr}`));
        }
      });

      proc.on("error", (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  const processIntegration = {
    script(scriptName: string) {
      return {
        runs() {
          repo.register(`process: ${scriptName} runs`, async () => {
            try {
              await execAsync(`npm run ${scriptName}`, {
                cwd: repoRoot,
                timeout: 30000,
              });
            } catch (error: any) {
              throw new Error(`Script "${scriptName}" failed: ${error.message}`);
            }
          });
        },

        bootsWhen(regex: RegExp) {
          repo.register(`process: ${scriptName} boots when ${regex}`, async () => {
            return new Promise((resolve, reject) => {
              const [cmd, ...args] = `npm run ${scriptName}`.split(" ");
              const proc = spawn(cmd, args, {
                cwd: repoRoot,
                shell: true,
              });

              let stdout = "";

              proc.stdout?.on("data", (data) => {
                stdout += data.toString();
                if (regex.test(stdout)) {
                  proc.kill();
                  resolve(undefined);
                }
              });

              proc.stderr?.on("data", (data) => {
                stdout += data.toString();
                if (regex.test(stdout)) {
                  proc.kill();
                  resolve(undefined);
                }
              });

              const timeout = 10000;
              const timeoutId = setTimeout(() => {
                proc.kill();
                if (regex.test(stdout)) {
                  resolve(undefined);
                } else {
                  reject(new Error(`Process "${scriptName}" did not output matching pattern ${regex} within ${timeout}ms`));
                }
              }, timeout);

              proc.on("close", () => {
                clearTimeout(timeoutId);
                if (regex.test(stdout)) {
                  resolve(undefined);
                } else {
                  reject(new Error(`Process "${scriptName}" exited without matching pattern ${regex}`));
                }
              });

              proc.on("error", (error) => {
                clearTimeout(timeoutId);
                reject(error);
              });
            });
          });
        },
      };
    },

    exec(command: string) {
      return {
        runs() {
          repo.register(`process: ${command} runs`, async () => {
            try {
              await execAsync(command, {
                cwd: repoRoot,
                timeout: 30000,
              });
            } catch (error: any) {
              throw new Error(`Command "${command}" failed: ${error.message}`);
            }
          });
        },

        outputs(regex: RegExp) {
          repo.register(`process: ${command} outputs ${regex}`, async () => {
            try {
              const { stdout } = await execAsync(command, {
                cwd: repoRoot,
                timeout: 30000,
              });
              expect(stdout).toContainLineMatching(regex);
            } catch (error: any) {
              throw new Error(`Command "${command}" failed: ${error.message}`);
            }
          });
        },
      };
    },
  };

  return processIntegration;
}
