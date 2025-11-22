import { RepoTester } from "./RepoTester";
import type { RepoTesterConfig } from "./RepoTesterConfig";

let verifyInstance: RepoTester | null = null;

const ensureInstance = () => {
  if (!verifyInstance) {
    verifyInstance = new RepoTester();
  }
  return verifyInstance;
};

export const configure = (config: RepoTesterConfig = {}) => {
  verifyInstance = new RepoTester(config);
  return verifyInstance;
};

export const getVerifyInstance = () => ensureInstance();

export interface Verify extends RepoTester {}

const proxy: Verify = new Proxy({} as Verify, {
  get(_target, prop) {
    return (ensureInstance() as any)[prop];
  },
  set(_target, prop, value) {
    (ensureInstance() as any)[prop] = value;
    return true;
  },
  has(_target, prop) {
    return prop in ensureInstance();
  },
  ownKeys() {
    return Reflect.ownKeys(ensureInstance());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(ensureInstance(), prop);
  },
});

export const verify: Verify = proxy;
export default verify;