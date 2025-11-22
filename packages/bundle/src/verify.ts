import {
  type RepoVerification,
  type VerificationMetadata,
} from "@verify-repo/engine";
import { RepoVerificationRuntime } from "./RepoVerificationRuntime";
import type { RepoVerifierConfig } from "./RepoVerifierConfig";

export type RepoVerifier = RepoVerification & {
  with(meta: VerificationMetadata): RepoVerifier;
};

let verifyInstance: RepoVerificationRuntime | null = null;

const ensureInstance = () => {
  if (!verifyInstance) {
    verifyInstance = new RepoVerificationRuntime();
  }
  return verifyInstance;
};

export const configure = (config: RepoVerifierConfig = {}) => {
  verifyInstance = new RepoVerificationRuntime(config);
  return verifyInstance;
};

export const getVerifyInstance = () => ensureInstance();

const RESERVED = new Set<PropertyKey>(["with"]);

function createVerifyProxy(meta: VerificationMetadata = {}): RepoVerifier {
  const normalizedMeta = { ...meta };

  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop, receiver) {
      const tester = ensureInstance();

      if (prop === "with") {
        return (extra: VerificationMetadata = {}) =>
          createVerifyProxy({ ...normalizedMeta, ...extra });
      }

      const pluginFactory = tester.getPluginEntrypoint(prop);
      if (pluginFactory) {
        const builder = tester.createVerificationBuilder(
          String(prop),
          normalizedMeta,
        );
        return pluginFactory(builder);
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
    ownKeys() {
      const tester = ensureInstance();
      const keys = new Set<PropertyKey>(["with"]);
      tester.getPluginNames().forEach((name) => keys.add(name));
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

  const proxyTarget: Record<string, unknown> = {};
  return new Proxy(proxyTarget, handler) as RepoVerifier;
}

export const verify: RepoVerifier = createVerifyProxy();
export default verify;