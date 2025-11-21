import type { IntegrationDefinition, RepoTestsIntegrations } from "./types";
import { createTypeScriptIntegration } from "./integrations/typescript";
import { createESLintIntegration } from "./integrations/eslint";
import { createPrettierIntegration } from "./integrations/prettier";
import { createGitIntegration } from "./integrations/git";
import { createFileIntegration } from "./integrations/file";
import { createDirIntegration } from "./integrations/dir";
import { createProcessIntegration } from "./integrations/process";
import { matchers } from "./matchers";

/**
 * Core RepoTests class that provides the declarative API for registering tests
 */
export class RepoTests {
  private integrations: Partial<RepoTestsIntegrations> = {};
  private repoRoot: string;

  // Built-in integrations as properties
  public ts!: any;
  public eslint!: any;
  public prettier!: any;
  public git!: any;
  public file!: any;
  public dir!: any;
  public process!: any;

  constructor(repoRoot?: string) {
    // Default to process.cwd() if not provided
    this.repoRoot = repoRoot || process.cwd();
    this.initializeBuiltInIntegrations();
    this.registerBuiltInMatchers();
  }

  /**
   * Register a test with the underlying test runner
   * This is the single internal path for test registration
   */
  register(testName: string, asyncFn: () => Promise<void> | void): void {
    if (typeof globalThis.test !== "function") {
      throw new Error(
        "RepoTests requires a global `test()` function. Make sure you're using Jest, Vitest, or Bun test."
      );
    }
    globalThis.test(testName, asyncFn);
  }

  /**
   * Register a plugin integration
   */
  useIntegration(definition: IntegrationDefinition): void {
    const integration = definition.create(this);
    (this.integrations as any)[definition.name] = integration;
    (this as any)[definition.name] = integration;

    // Register custom matchers if provided
    if (definition.matchers && typeof globalThis.expect !== "undefined") {
      if (typeof globalThis.expect.extend === "function") {
        globalThis.expect.extend(definition.matchers);
      }
    }
  }

  /**
   * Get the repository root directory
   */
  getRepoRoot(): string {
    return this.repoRoot;
  }

  /**
   * Initialize all built-in integrations
   */
  private initializeBuiltInIntegrations(): void {
    this.ts = createTypeScriptIntegration(this);
    this.eslint = createESLintIntegration(this);
    this.prettier = createPrettierIntegration(this);
    this.git = createGitIntegration(this);
    this.file = createFileIntegration(this);
    this.dir = createDirIntegration(this);
    this.process = createProcessIntegration(this);
  }

  /**
   * Register built-in custom matchers
   */
  private registerBuiltInMatchers(): void {
    if (typeof globalThis.expect !== "undefined" && typeof globalThis.expect.extend === "function") {
      globalThis.expect.extend(matchers);
    }
  }

  /**
   * Get an integration by name
   */
  getIntegration<T extends keyof RepoTestsIntegrations>(
    name: T
  ): RepoTestsIntegrations[T] {
    return this.integrations[name] as RepoTestsIntegrations[T];
  }
}
