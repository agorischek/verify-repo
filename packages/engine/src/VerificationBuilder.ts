import type { PluginContext, RepoTestHandler, VerificationMetadata } from "./types";

export interface VerificationBuilderOptions {
  pluginName: string;
  schedule: PluginContext["schedule"];
  root?: string;
  baseDir?: string;
  meta?: VerificationMetadata;
  autoFinalize?: boolean;
  parent?: VerificationBuilder;
}

export class VerificationBuilder {
  public readonly pluginName: string;
  public readonly root?: string;
  public readonly baseDir?: string;

  private readonly scheduleFn: PluginContext["schedule"];
  private readonly parent?: VerificationBuilder;
  private readonly children = new Set<VerificationBuilder>();
  private readonly meta: VerificationMetadata;
  private readonly autoFinalize: boolean;

  private checkRegistered = false;
  private finalized = false;

  constructor(options: VerificationBuilderOptions) {
    const {
      pluginName,
      schedule,
      root,
      baseDir,
      meta,
      autoFinalize = true,
      parent,
    } = options;

    this.pluginName = pluginName;
    this.scheduleFn = schedule;
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

  public register<T>(check: () => T): T {
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

  public createChild(
    meta?: VerificationMetadata,
    options?: { autoFinalize?: boolean },
  ): VerificationBuilder {
    return new VerificationBuilder({
      pluginName: this.pluginName,
      schedule: this.scheduleFn,
      root: this.root,
      baseDir: this.baseDir,
      meta: { ...this.meta, ...(meta ?? {}) },
      autoFinalize: options?.autoFinalize ?? false,
      parent: this,
    });
  }

  public schedule(description: string, handler: RepoTestHandler) {
    this.scheduleFn(description, handler);
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
