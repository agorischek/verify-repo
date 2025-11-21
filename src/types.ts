/**
 * Type definitions for RepoTests
 */

export interface RepoTestsIntegrations {
  // Built-in integrations
  ts: any;
  eslint: any;
  prettier: any;
  git: any;
  file: any;
  dir: any;
  process: any;
}

export interface MatcherResult {
  pass: boolean;
  message: () => string;
}

export type MatcherFunction = (received: any, ...args: any[]) => MatcherResult;

export interface IntegrationDefinition {
  name: string;
  create: (repo: any) => any;
  matchers?: { [name: string]: MatcherFunction };
}

export type TestFunction = (name: string, fn: () => Promise<void> | void) => void;

export interface ExpectMatchers {
  [name: string]: (...args: any[]) => any;
}

export interface Expect {
  (received: any): ExpectMatchers & {
    toBe: (expected: any) => void;
    toEqual: (expected: any) => void;
    toContain: (expected: any) => void;
    [key: string]: any;
  };
  extend(matchers: { [name: string]: MatcherFunction }): void;
}

declare global {
  // These are provided by the test runner (Jest/Vitest/Bun)
  // eslint-disable-next-line no-var
  var test: TestFunction;
  // eslint-disable-next-line no-var
  var expect: Expect;
  // eslint-disable-next-line no-var
  var describe: (name: string, fn: () => void) => void;
}
