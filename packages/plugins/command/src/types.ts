export interface CommandRunOptions {
  expectExitCode?: number;
  timeoutMs?: number;
  dir?: string;
  env?: NodeJS.ProcessEnv;
}

export interface CommandOutputOptions {
  timeoutMs?: number;
  dir?: string;
  env?: NodeJS.ProcessEnv;
}

export interface CommandPluginApi {
  runs: (options?: CommandRunOptions) => void;
  outputs: (regex: RegExp, options?: CommandOutputOptions) => void;
}
