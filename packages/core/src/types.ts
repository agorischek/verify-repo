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

export interface PluginContext {
  root?: string;
  schedule: (description: string, handler: RepoTestHandler) => void;
}

export type VerificationMetadata = Record<string, unknown>;

export type PluginEntrypointFactory<
  TResult = unknown,
  TBuilder = import("./VerificationBuilder").VerificationBuilder,
> = (builder: TBuilder) => TResult;

export type RepoPluginResult = Record<string, PluginEntrypointFactory>;

export type RepoPlugin<T extends RepoPluginResult = RepoPluginResult> = (
  context: PluginContext,
) => T;

export interface RepoTestsConfig {
  plugins?: RepoPlugin[];
  root?: string;
  defaultConcurrency?: number;
}

/**
 * This interface is intended to be augmented by plugins.
 * Plugins should add their property definitions here.
 *
 * Example:
 * declare module 'repo-tests' {
 *   interface RepoTestsExtensions {
 *     myPlugin: MyPluginApi;
 *   }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RepoTestsExtensions {}
