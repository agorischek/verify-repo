import { RepoTester } from './RepoTester';
import { RepoPlugin } from '@repo-tests/core';

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
        'No test and expect found in globals. Use verify.with({ test, expect }) to provide them explicitly.'
      );
    }
    verifyInstance = new RepoTester({ test, expect });
  }
  return verifyInstance;
};

/**
 * Type for the verify object with additional methods
 */
export interface Verify extends RepoTester {
  /**
   * Create a new RepoTester instance with custom test and expect functions.
   * If not provided, defaults to globals.
   */
  with(config: { test?: any; expect?: any; root?: string }): RepoTester;
  
  /**
   * Extend the default verify instance with additional plugins.
   * This mutates the verify instance in place.
   */
  extend(...plugins: RepoPlugin[]): this;
}

// Create a proxy that lazily initializes the verify instance
const createVerifyProxy = (): Verify => {
  return new Proxy({} as Verify, {
    get(target, prop) {
      // Handle with method
      if (prop === 'with') {
        return function(config: { test?: any; expect?: any; root?: string }): RepoTester {
          const { test: configTest, expect: configExpect, root } = config;
          const { test: globalTest, expect: globalExpect } = getGlobals();
          
          const test = configTest ?? globalTest;
          const expect = configExpect ?? globalExpect;

          if (!test || !expect) {
            throw new Error('test and expect must be provided either in config or available as globals');
          }

          return new RepoTester({ test, expect, root });
        };
      }
      
      // Handle extend method
      if (prop === 'extend') {
        return function(...plugins: RepoPlugin[]): typeof proxy {
          getVerifyInstance().extend(...plugins);
          return proxy;
        };
      }
      
      // For all other properties, get from the lazily-initialized instance
      return (getVerifyInstance() as any)[prop];
    },
    set(target, prop, value) {
      (getVerifyInstance() as any)[prop] = value;
      return true;
    },
    has(target, prop) {
      return prop === 'with' || prop === 'extend' || prop in getVerifyInstance();
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
 * Main verify object. Can be used directly or configured with .with()
 */
export const verify: Verify = proxy;