export interface BunTestOptions {
  /**
   * Additional command-line arguments passed to `bun test`.
   */
  args?: string[];
  /**
   * Working directory for the command (defaults to the verify file directory).
   */
  cwd?: string;
  /**
   * Environment variables to merge with the current process env.
   */
  env?: NodeJS.ProcessEnv;
  /**
   * Optional timeout (in milliseconds) before the process is killed.
   */
  timeoutMs?: number;
}

export interface BunTestApi {
  /**
   * Runs `bun test` and expects it to exit successfully.
   */
  passes: (options?: BunTestOptions) => void;
}

export interface BunPluginApi {
  test: BunTestApi;
}
