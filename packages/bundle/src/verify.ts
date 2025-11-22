import { RepoTester } from "./RepoTester";
import { RepoPlugin } from "@repo-tests/core";

// Try to get globals, but they might not be available in all environments
const getGlobals = () => {
  const test = (globalThis as any).test;
  const expect = (globalThis as any).expect;
  return { test, expect };
};

// Create the default verify instance with globals if available
// Use lazy initialization to avoid errors during build
let verifyInstance: RepoTester | null = null;

const getVerifyInstance = (): RepoTester => {
  if (!verifyInstance) {
    const { test, expect } = getGlobals();
    if (!test || !expect) {
      throw new Error(
        "No test and expect found in globals. Use configure({ test, expect }) to provide them explicitly.",
      );
    }
    verifyInstance = new RepoTester({ test, expect });
  }
  return verifyInstance;
};

/**
 * Configure the verify singleton.
 * This mutates the verify instance in place or re-initializes it.
 */
export const configure = (config: {
  test?: any;
  expect?: any;
  root?: string;
  plugins?: RepoPlugin[];
}) => {
  const { test: configTest, expect: configExpect, root, plugins = [] } = config;
  const { test: globalTest, expect: globalExpect } = getGlobals();

  const test = configTest ?? globalTest;
  const expect = configExpect ?? globalExpect;

  if (!test || !expect) {
    throw new Error(
      "test and expect must be provided either in config or available as globals",
    );
  }

  // Create new instance with provided config
  verifyInstance = new RepoTester({ test, expect, root, plugins });
};

/**
 * Type for the verify object
 */
export interface Verify extends RepoTester {}

// Create a proxy that lazily initializes the verify instance
const createVerifyProxy = (): Verify => {
  return new Proxy({} as Verify, {
    get(target, prop) {
      // For all properties, get from the lazily-initialized instance
      return (getVerifyInstance() as any)[prop];
    },
    set(target, prop, value) {
      (getVerifyInstance() as any)[prop] = value;
      return true;
    },
    has(target, prop) {
      return prop in getVerifyInstance();
    },
    ownKeys(target) {
      return Reflect.ownKeys(getVerifyInstance());
    },
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(getVerifyInstance(), prop);
    },
  });
};

const proxy = createVerifyProxy();

/**
 * Main verify object. Use configure() to set up test runner and options.
 */
export const verify: Verify = proxy;
