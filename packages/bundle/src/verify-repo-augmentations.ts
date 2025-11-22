import type { RepoVerification as CoreRepoVerification } from "@verify-repo/engine";

declare module "verify-repo" {
  interface RepoVerification extends CoreRepoVerification {}
}

export {};

