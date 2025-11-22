import type { RepoTestRunSummary } from "@repo-tests/core";

export class RepoTestsFailedError extends Error {
  public readonly summary: RepoTestRunSummary;

  constructor(summary: RepoTestRunSummary) {
    const failed = summary.failed;
    super(`${failed} repo test${failed === 1 ? "" : "s"} failed.`);
    this.name = "RepoTestsFailedError";
    this.summary = summary;
  }
}
