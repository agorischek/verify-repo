import { performance } from "node:perf_hooks";
import path from "node:path";
import {
  PluginDocumentation,
  PluginDocumentationEntry,
  PluginEntrypointFactory,
  PluginOptions,
  RepoPlugin,
  RepoPluginFactory,
  RepoTestDefinition,
  RepoTestHandler,
  RepoTestResult,
  RepoTestRunSummary,
  RepoVerification,
  RepoVerificationEngineConfig,
  VerificationMetadata,
} from "./types";
import { VerificationContext } from "./VerificationContext";

// Use declaration merging to mix in extensions defined by plugins.
export interface RepoVerificationEngine extends RepoVerification {}

export class RepoVerificationEngine {
  // Allow plugins to assign arbitrary APIs on the instance through declaration merging.
  [key: string]: any;

  public readonly root?: string;
  private readonly defaultConcurrency?: number;
  private readonly packageManager?: "npm" | "yarn" | "pnpm" | "bun";
  private tests: RepoTestDefinition[] = [];
  private nextTestId = 0;
  private activeSource?: string;
  private readonly pluginEntries = new Map<
    PropertyKey,
    PluginEntrypointFactory
  >();
  private readonly pluginDocs: PluginDocumentation[] = [];

  constructor(config: RepoVerificationEngineConfig) {
    const { plugins = [], root, defaultConcurrency, packageManager } = config;
    this.root = root;
    this.defaultConcurrency = defaultConcurrency;
    this.packageManager = packageManager;

    for (const plugin of plugins) {
      this.applyPlugin(plugin);
    }
  }

  protected applyPlugin(plugin: RepoPlugin) {
    const { factory, name, description, docs } = this.resolvePlugin(plugin);
    this.recordPluginDocs(name, description, docs);

    const options: PluginOptions = {
      root: this.root,
      packageManager: this.packageManager,
    };

    const api = factory(options) || {};
    for (const [name, factory] of Object.entries(api)) {
      if (typeof factory !== "function") {
        throw new Error(
          `Plugin entrypoint "${String(name)}" must be a function.`,
        );
      }
      this.registerPluginEntrypoint(name, factory as PluginEntrypointFactory);
    }
  }

  protected register(description: string, handler: RepoTestHandler) {
    if (!description || typeof description !== "string") {
      throw new Error("Repo test description must be a non-empty string.");
    }
    if (typeof handler !== "function") {
      throw new Error("Repo test handler must be a function.");
    }

    const definition: RepoTestDefinition = {
      id: this.nextTestId++,
      description,
      handler,
      source: this.activeSource,
    };

    this.tests.push(definition);
    return definition.id;
  }

  public getPluginEntrypoint(name: PropertyKey) {
    return this.pluginEntries.get(name);
  }

  public getPluginNames(): PropertyKey[] {
    return Array.from(this.pluginEntries.keys());
  }

  public getPluginDocumentation(): PluginDocumentation[] {
    return this.pluginDocs.map((doc) => ({
      ...doc,
      entries: doc.entries.map((entry) => ({ ...entry })),
    }));
  }

  public createVerificationContext(
    pluginName: string,
    meta?: VerificationMetadata,
    options?: { autoFinalize?: boolean },
  ) {
    return new VerificationContext({
      pluginName,
      meta,
      root: this.root,
      baseDir: this.activeSource ? path.dirname(this.activeSource) : undefined,
      register: (description, handler) => this.register(description, handler),
      autoFinalize: options?.autoFinalize,
    });
  }

  private registerPluginEntrypoint(
    name: PropertyKey,
    factory: PluginEntrypointFactory,
  ) {
    if (name === "with") {
      throw new Error('Plugin name "with" is reserved and cannot be used.');
    }

    this.pluginEntries.set(name, factory);
  }

  private recordPluginDocs(
    name?: string,
    description?: string,
    docs?: PluginDocumentationEntry[],
  ) {
    if (!name || !docs || docs.length === 0) {
      return;
    }
    this.pluginDocs.push({
      name,
      description,
      entries: docs.map((entry) => ({
        signature: entry.signature,
        description: entry.description,
      })),
    });
  }

  private resolvePlugin(plugin: RepoPlugin): {
    factory: RepoPluginFactory;
    name?: string;
    description?: string;
    docs?: PluginDocumentationEntry[];
  } {
    if (typeof plugin === "function") {
      return {
        factory: plugin,
        name: plugin.name,
        description: plugin.description,
        docs: plugin.docs,
      };
    }
    if (
      plugin &&
      typeof plugin === "object" &&
      typeof plugin.api === "function"
    ) {
      return {
        factory: plugin.api.bind(plugin),
        name: plugin.name,
        description: plugin.description,
        docs: plugin.docs,
      };
    }
    throw new Error(
      "Repo plugin must be a function or an object with an api() method.",
    );
  }

  public enterFileScope(source?: string | null) {
    const previous = this.activeSource;
    this.activeSource = source ?? undefined;
    return () => {
      this.activeSource = previous;
    };
  }

  public async withFileScope<T>(
    source: string | undefined,
    task: () => Promise<T> | T,
  ): Promise<T> {
    const restore = this.enterFileScope(source);
    try {
      return await task();
    } finally {
      restore();
    }
  }

  public get plannedTests(): number {
    return this.tests.length;
  }

  public clear() {
    this.tests = [];
    this.nextTestId = 0;
  }

  public async run(options?: {
    concurrency?: number;
  }): Promise<RepoTestRunSummary> {
    const plan = [...this.tests];
    const total = plan.length;

    if (total === 0) {
      return {
        total: 0,
        passed: 0,
        failed: 0,
        durationMs: 0,
        results: [],
      };
    }

    const resolvedConcurrency =
      options?.concurrency ??
      this.defaultConcurrency ??
      Number.POSITIVE_INFINITY;

    const workerCount = Math.max(
      1,
      Math.min(
        total,
        Number.isFinite(resolvedConcurrency) ? resolvedConcurrency : total,
      ),
    );

    const results: RepoTestResult[] = new Array(total);
    let cursor = 0;
    const startedAt = performance.now();

    const worker = async () => {
      while (true) {
        const index = cursor++;
        const definition = plan[index];
        if (!definition) {
          break;
        }
        results[index] = await this.execute(definition);
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const durationMs = performance.now() - startedAt;
    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return {
      total,
      passed,
      failed,
      durationMs,
      results,
    };
  }

  private async execute(
    definition: RepoTestDefinition,
  ): Promise<RepoTestResult> {
    const startedAt = performance.now();
    const result: RepoTestResult = {
      id: definition.id,
      description: definition.description,
      source: definition.source,
      status: "pending",
      durationMs: 0,
    };

    let settled = false;

    const settle = (
      status: "passed" | "failed",
      message?: string,
      error?: unknown,
    ) => {
      if (settled) {
        return;
      }
      settled = true;
      result.status = status;
      result.message = message ?? definition.description;
      if (status === "failed" && error !== undefined) {
        result.error = this.serializeError(error);
      }
    };

    const controls = {
      pass: (message: string) => settle("passed", message),
      fail: (message: string, error?: unknown) =>
        settle("failed", message, error),
    };

    try {
      await definition.handler(controls);
      if (!settled) {
        settle(
          "failed",
          `Test "${definition.description}" completed without calling pass() or fail().`,
        );
      }
    } catch (error) {
      settle(
        "failed",
        `Test "${definition.description}" threw an error.`,
        error,
      );
    } finally {
      result.durationMs = performance.now() - startedAt;
    }

    return result;
  }

  private serializeError(error: unknown): string {
    if (error instanceof Error) {
      return error.stack || error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
