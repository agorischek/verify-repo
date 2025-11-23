import type {
  PluginContext,
  RepoTestHandler,
  VerificationMetadata,
} from "./types";

export interface VerificationContextOptions {
  pluginName: string;
  register: PluginContext["register"];
  root?: string;
  baseDir?: string;
  meta?: VerificationMetadata;
  autoFinalize?: boolean;
  parent?: VerificationContext;
}

export class VerificationContext {
  public readonly pluginName: string;
  public readonly root?: string;
  public readonly baseDir?: string;

  private readonly registerFn: PluginContext["register"];
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

  public get cwd(): string {
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
