import path from "node:path";
import type { RepoTestRunSummary } from "@verify-repo/engine";

export function defaultReporter(
  summary: RepoTestRunSummary,
  root: string,
  verbose: boolean = false,
  totalDurationMs?: number,
) {
  // Use total CLI duration if available, otherwise fall back to test execution duration
  const durationMs = totalDurationMs ?? summary.durationMs;

  if (summary.total === 0) {
    console.log("verify-repo: no checks were scheduled.");
    return;
  }

  if (verbose) {
    // Verbose mode: show all checks
    for (const result of summary.results) {
      const location = result.source ? relativePath(root, result.source) : "";
      const prefix = result.status === "passed" ? "[PASS]" : "[FAIL]";
      const duration = formatDuration(result.durationMs);
      const line = location
        ? `${prefix} ${location} — ${result.message ?? result.description} (${duration})`
        : `${prefix} ${result.message ?? result.description} (${duration})`;

      if (result.status === "passed") {
        console.log(line);
      } else {
        console.error(line);
        if (result.error) {
          console.error(indent(result.error, 2));
        }
      }
    }

    console.log(
      `verify-repo: ${summary.passed}/${summary.total} passed, ${summary.failed} failed in ${formatDuration(durationMs)}`,
    );
  } else {
    // Non-verbose mode: concise output
    if (summary.failed === 0) {
      console.log(`All checks passed in ${formatDuration(durationMs)}.`);
    } else {
      console.error(`${summary.failed} check${summary.failed === 1 ? "" : "s"} failed:`);
      for (const result of summary.results) {
        if (result.status === "failed") {
          const location = result.source ? relativePath(root, result.source) : "";
          const line = location
            ? `${location} — ${result.message ?? result.description}`
            : (result.message ?? result.description);
          console.error(`  ${line}`);
          if (result.error) {
            console.error(indent(result.error, 4));
          }
        }
      }
    }
  }
}

export function relativePath(root: string, target: string) {
  const relative = path.relative(root, target);
  return relative.startsWith("..") ? target : relative || path.basename(target);
}

export function indent(text: string, spaces: number) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}

export function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs.toFixed(0)}ms`;
  }
  return `${(durationMs / 1000).toFixed(2)}s`;
}
