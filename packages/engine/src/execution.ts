import { performance } from "node:perf_hooks";
import type { RepoTestDefinition, RepoTestResult, RepoTestRunSummary } from "./types";

export async function executeTests(
  plan: RepoTestDefinition[],
  defaultConcurrency: number | undefined,
  options?: { concurrency?: number },
): Promise<RepoTestRunSummary> {
  const total = plan.length;

  if (total === 0) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      durationMs: 0,
      results: [],
    };
  }

  const resolvedConcurrency = options?.concurrency ?? defaultConcurrency ?? Number.POSITIVE_INFINITY;

  const workerCount = Math.max(1, Math.min(total, Number.isFinite(resolvedConcurrency) ? resolvedConcurrency : total));

  const results: RepoTestResult[] = new Array(total);
  let cursor = 0;
  const startedAt = performance.now();

  const worker = async () => {
    while (true) {
      const index = cursor++;
      const definition = plan[index];
      if (!definition) {
        break;
      }
      results[index] = await executeTest(definition);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const durationMs = performance.now() - startedAt;
  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return {
    total,
    passed,
    failed,
    durationMs,
    results,
  };
}

async function executeTest(definition: RepoTestDefinition): Promise<RepoTestResult> {
  const startedAt = performance.now();
  const result: RepoTestResult = {
    id: definition.id,
    description: definition.description,
    source: definition.source,
    status: "pending",
    durationMs: 0,
  };

  try {
    const checkResult = await definition.handler();
    result.status = checkResult.pass ? "passed" : "failed";
    result.message = checkResult.message;
    if (!checkResult.pass && checkResult.error !== undefined) {
      result.error = serializeError(checkResult.error);
    }
  } catch (error) {
    result.status = "failed";
    result.message = `Test "${definition.description}" threw an error.`;
    result.error = serializeError(error);
  } finally {
    result.durationMs = performance.now() - startedAt;
  }

  return result;
}

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
