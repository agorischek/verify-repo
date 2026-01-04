import type { RepoTestRunSummary } from "@verify-repo/engine";

export class RepoVerificationFailedError extends Error {
  public readonly summary: RepoTestRunSummary;

  constructor(summary: RepoTestRunSummary) {
    const failed = summary.failed;
    super(`${failed} verification${failed === 1 ? "" : "s"} failed.`);
    this.name = "RepoVerificationFailedError";
    this.summary = summary;
  }
}
