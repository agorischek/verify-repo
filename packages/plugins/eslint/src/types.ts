export interface EslintOptions {
  files?: string | string[];
  maxWarnings?: number;
  config?: string;
  fix?: boolean;
  dir?: string;
  timeoutMs?: number;
}

export interface EslintPluginApi {
  passes: (options?: EslintOptions) => void;
}
