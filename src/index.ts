/**
 * RepoTests - Declarative, synchronous API for registering repository tests
 */

export { RepoTests } from "./core";
export type {
  IntegrationDefinition,
  RepoTestsIntegrations,
  MatcherFunction,
  MatcherResult,
} from "./types";
export { matchers } from "./matchers";

// Re-export for convenience
export { RepoTests as default } from "./core";
