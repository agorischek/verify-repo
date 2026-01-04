import path from "node:path";
import { fileURLToPath } from "node:url";
import { type RepoVerification, type VerificationMetadata } from "@verify-repo/engine";
import { RepoVerificationRuntimeBase } from "./RepoVerificationRuntimeBase";
import type { RepoVerifierConfig } from "./RepoVerifierConfig";

export type RepoVerifier = RepoVerification & {
  with(meta: VerificationMetadata): RepoVerifier;
};

/**
 * Factory function type for creating runtime instances.
 * Bundle provides this with all built-in plugins.
 */
export type RuntimeFactory = (config?: RepoVerifierConfig) => RepoVerificationRuntimeBase;

let verifyInstance: RepoVerificationRuntimeBase | null = null;
let runtimeFactory: RuntimeFactory = (config) => new RepoVerificationRuntimeBase(config);

/**
 * Set the runtime factory. Called by bundle to provide a factory that includes all plugins.
 */
export const setRuntimeFactory = (factory: RuntimeFactory) => {
  runtimeFactory = factory;
};

const ensureInstance = () => {
  if (!verifyInstance) {
    verifyInstance = runtimeFactory();
  }
  return verifyInstance;
};

/**
 * Normalizes a root path, handling both file paths and file:// URLs (like import.meta.url).
 * If a URL is provided, it extracts the directory path from it.
 * If a path is provided, it returns it as-is.
 */
export function normalizeRoot(root: string | undefined): string | undefined {
  if (!root) {
    return undefined;
  }

  // Check if it's a URL (file:// protocol)
  if (root.startsWith("file://")) {
    return path.dirname(fileURLToPath(root));
  }

  // Already a path, return as-is
  return root;
}

export const configure = (config: RepoVerifierConfig = {}) => {
  const normalizedConfig: RepoVerifierConfig = {
    ...config,
    root: normalizeRoot(config.root),
  };
  verifyInstance = runtimeFactory(normalizedConfig);
  return verifyInstance;
};

export const getVerifyInstance = () => ensureInstance();

const RESERVED = new Set<PropertyKey>(["with"]);

function createVerifyProxy(meta: VerificationMetadata = {}): RepoVerifier {
  const normalizedMeta = { ...meta };

  // Create a target object that satisfies the RepoVerifier interface requirements
  // (specifically the 'with' method) so that we can cast it safely.
  const proxyTarget = {
    with: (extra: VerificationMetadata) => createVerifyProxy({ ...normalizedMeta, ...extra }),
  } as RepoVerifier;

  const handler: ProxyHandler<RepoVerifier> = {
    get(_target, prop, receiver) {
      const tester = ensureInstance();

      if (prop === "with") {
        return (extra: VerificationMetadata = {}) => createVerifyProxy({ ...normalizedMeta, ...extra });
      }

      const pluginFactory = tester.getPluginEntrypoint(prop);
      if (pluginFactory) {
        const context = tester.createVerificationContext(String(prop), normalizedMeta);
        return pluginFactory(context);
      }

      const value = (tester as any)[prop];
      if (typeof value === "function") {
        return value.bind(tester);
      }
      return value;
    },
    set(_target, prop, value) {
      if (RESERVED.has(prop)) {
        throw new Error(`Cannot set reserved property "${String(prop)}".`);
      }
      (ensureInstance() as any)[prop] = value;
      return true;
    },
    has(_target, prop) {
      if (prop === "with") {
        return true;
      }
      if (ensureInstance().getPluginEntrypoint(prop)) {
        return true;
      }
      return prop in ensureInstance();
    },
    ownKeys(target) {
      const tester = ensureInstance();
      const keys = new Set<string | symbol>(["with"]);
      tester.getPluginNames().forEach((name) => {
        if (typeof name !== "number") {
          keys.add(name);
        }
      });
      Reflect.ownKeys(tester).forEach((key) => {
        if (!RESERVED.has(key)) {
          keys.add(key);
        }
      });
      return Array.from(keys);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (prop === "with") {
        return {
          configurable: true,
          enumerable: false,
          writable: false,
          value: undefined,
        };
      }
      if (ensureInstance().getPluginEntrypoint(prop)) {
        return {
          configurable: true,
          enumerable: true,
          writable: false,
          value: undefined,
        };
      }
      return Object.getOwnPropertyDescriptor(ensureInstance(), prop as any);
    },
  };

  return new Proxy(proxyTarget, handler);
}

export const verify: RepoVerifier = createVerifyProxy();
export default verify;
