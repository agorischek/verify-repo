import {
  PluginEntry,
  type PluginMethod,
  type PluginCallHandler,
} from "./PluginEntry";
import type { RepoTestHandler, VerificationMetadata } from "./types";

export interface VerificationContextOptions {
  pluginName: string;
  register: (description: string, handler: RepoTestHandler) => void;
  root?: string;
  baseDir?: string;
  meta?: VerificationMetadata;
  autoFinalize?: boolean;
  parent?: VerificationContext;
}

export class VerificationContext {
  public readonly pluginName: string;
  /**
   * Repository root directory. Rarely needed by plugins - use `dir` instead.
   * Only exposed for edge cases like git operations that need repo-relative paths.
   */
  public readonly root?: string;
  private readonly baseDir?: string;

  private readonly registerFn: (
    description: string,
    handler: RepoTestHandler,
  ) => void;
  private readonly parent?: VerificationContext;
  private readonly children = new Set<VerificationContext>();
  private readonly meta: VerificationMetadata;
  private readonly autoFinalize: boolean;

  private checkRegistered = false;
  private finalized = false;

  constructor(options: VerificationContextOptions) {
    const {
      pluginName,
      register,
      root,
      baseDir,
      meta,
      autoFinalize = true,
      parent,
    } = options;

    this.pluginName = pluginName;
    this.registerFn = register;
    this.root = root;
    this.baseDir = baseDir;
    this.parent = parent;
    this.meta = { ...(meta ?? {}) };
    this.autoFinalize = autoFinalize;

    if (this.parent) {
      this.parent.children.add(this);
    }

    if (this.autoFinalize) {
      queueMicrotask(() => {
        this.finalize();
      });
    }
  }

  /**
   * Current working directory for path resolution.
   * 
   * This is the primary property plugins should use for resolving relative paths.
   * It resolves to:
   * 1. The directory containing the current verify file (if executing from a verify file)
   * 2. The repository root (if set)
   * 3. `process.cwd()` (fallback)
   * 
   * @example
   * ```ts
   * // In a plugin
   * const filePath = path.resolve(context.dir, "package.json");
   * ```
   */
  public get dir(): string {
    return this.baseDir ?? this.root ?? process.cwd();
  }

  public get metadata(): Readonly<VerificationMetadata> {
    return this.meta;
  }

  /**
   * @internal
   */
  public lock<T>(check: () => T): T {
    if (this.checkRegistered) {
      throw new Error(
        `Only one check can be registered for verify.${this.pluginName}.`,
      );
    }

    this.checkRegistered = true;
    this.parent?.handleChildRegistration();

    return check();
  }

  public finalize() {
    if (this.finalized) {
      return;
    }
    this.finalized = true;

    for (const child of Array.from(this.children)) {
      child.finalize();
    }
    this.children.clear();

    if (!this.checkRegistered) {
      throw new Error(this.buildMissingCheckMessage());
    }
  }

  public extend(
    meta?: VerificationMetadata,
    options?: { autoFinalize?: boolean },
  ): VerificationContext {
    return new VerificationContext({
      pluginName: this.pluginName,
      register: this.registerFn,
      root: this.root,
      baseDir: this.baseDir,
      meta: { ...this.meta, ...(meta ?? {}) },
      autoFinalize: options?.autoFinalize ?? false,
      parent: this,
    });
  }

  public entry<TMethods extends Record<string, PluginMethod>>(
    methods: TMethods,
    callHandler?: PluginCallHandler,
  ): PluginEntry<TMethods, PluginCallHandler | undefined> {
    return new PluginEntry(this, methods, callHandler);
  }

  public register(description: string, handler: RepoTestHandler) {
    this.registerFn(description, handler);
  }

  private handleChildRegistration() {
    if (this.checkRegistered) {
      throw new Error(
        `Only one check can be registered for verify.${this.pluginName}.`,
      );
    }
    this.checkRegistered = true;
    this.parent?.handleChildRegistration();
  }

  private buildMissingCheckMessage() {
    const metaKeys = Object.keys(this.meta);
    const metaDetails =
      metaKeys.length > 0 ? ` Metadata: ${JSON.stringify(this.meta)}.` : "";
    return `No check was registered for verify.${this.pluginName}.${metaDetails}`.trim();
  }
}
