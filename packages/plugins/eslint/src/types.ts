export interface EslintOptions {
  files?: string | string[];
  maxWarnings?: number;
  config?: string;
  fix?: boolean;
  cwd?: string;
  timeoutMs?: number;
}

export interface EslintPluginApi {
  passes: (options?: EslintOptions) => void;
}
