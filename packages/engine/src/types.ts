export type MaybePromise<T> = T | Promise<T>;

export type PassHandler = (message: string) => void;
export type FailHandler = (message: string, error?: unknown) => void;

export interface RepoTestControls {
  pass: PassHandler;
  fail: FailHandler;
}

export type RepoTestHandler = (controls: RepoTestControls) => MaybePromise<void>;

export interface RepoTestDefinition {
  id: number;
  description: string;
  handler: RepoTestHandler;
  source?: string;
}

export type RepoTestStatus = "pending" | "passed" | "failed";

export interface RepoTestResult {
  id: number;
  description: string;
  source?: string;
  status: RepoTestStatus;
  message?: string;
  error?: string;
  durationMs: number;
}

export interface RepoTestRunSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: RepoTestResult[];
}

export interface PluginOptions {
  root?: string;
  packageManager?: "npm" | "yarn" | "pnpm" | "bun";
}

export type VerificationMetadata = Record<string, unknown>;

export type PluginEntrypointFactory<
  TResult = unknown,
  TBuilder = import("./VerificationContext").VerificationContext,
> = (context: TBuilder) => TResult;

export type RepoPluginResult = Record<string, PluginEntrypointFactory>;

export interface PluginDocumentationEntry {
  signature: string;
  description?: string;
}

export interface PluginDocumentation {
  name: string;
  description?: string;
  entries: PluginDocumentationEntry[];
}

export interface RepoPluginMetadata {
  name?: string;
  description?: string;
  docs?: PluginDocumentationEntry[];
}

export interface RepoPluginFactory<T extends RepoPluginResult = RepoPluginResult> extends RepoPluginMetadata {
  (options: PluginOptions): T;
}

export interface RepoPluginDefinition<T extends RepoPluginResult = RepoPluginResult> extends RepoPluginMetadata {
  api: RepoPluginFactory<T>;
}

export type RepoPlugin<T extends RepoPluginResult = RepoPluginResult> = RepoPluginFactory<T> | RepoPluginDefinition<T>;

export interface RepoVerificationEngineConfig {
  plugins?: RepoPlugin[];
  root?: string;
  defaultConcurrency?: number;
  packageManager?: "npm" | "yarn" | "pnpm" | "bun";
}

/**
 * This interface is intended to be augmented by plugins.
 * Plugins should add their property definitions here.
 *
 * Example:
 * declare module 'verify-repo' {
 *   interface RepoVerification {
 *     myPlugin: MyPluginApi;
 *   }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RepoVerification {}
