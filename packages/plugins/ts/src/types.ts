export interface TsCheckOptions {
  cwd?: string;
  timeoutMs?: number;
}

export interface TsPluginApi {
  noErrors: (options?: TsCheckOptions) => void;
  builds: (options?: TsCheckOptions) => void;
  buildsProject: (tsconfigPath: string, options?: TsCheckOptions) => void;
}
