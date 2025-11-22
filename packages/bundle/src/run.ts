import path from "node:path";
import { pathToFileURL } from "node:url";
import { glob } from "glob";
import type { RepoTestRunSummary } from "@repo-tests/core";
import { RepoTesterConfig } from "./RepoTesterConfig";
import { configure } from "./verify";
import { RepoTestsFailedError } from "./errors";

const DEFAULT_PATTERN = "**/*?.verify.{js,ts}";
const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.git/**",
];

export interface RunOptions extends RepoTesterConfig {
  pattern?: string | string[];
  ignore?: string[];
  /**
   * Provide a custom reporter. Set to false to silence output.
   */
  reporter?: false | ((summary: RepoTestRunSummary) => void);
}

export async function run(options: RunOptions = {}) {
  const root = options.root ?? process.cwd();
  const verifyInstance = configure({
    root,
    plugins: options.plugins,
    concurrency: options.concurrency,
  });

  const files = await discoverVerifyFiles(root, options.pattern, options.ignore);
  const runtimeTag = Date.now().toString(36);

  for (const file of files) {
    await verifyInstance.withFileScope(file, async () => {
      try {
        const fileUrl = pathToFileURL(file);
        fileUrl.search = `?run=${runtimeTag}-${Math.random()
          .toString(36)
          .slice(2)}`;
        await import(fileUrl.href);
      } catch (error) {
        throw new Error(
          `Failed to load verify file at ${relativePath(root, file)}`,
          { cause: error },
        );
      }
    });
  }

  const summary = await verifyInstance.run({
    concurrency: options.concurrency,
  });

  const reporter =
    options.reporter === false
      ? null
      : options.reporter ?? ((result) => defaultReporter(result, root));
  reporter?.(summary);

  if (summary.failed > 0) {
    throw new RepoTestsFailedError(summary);
  }

  return summary;
}

async function discoverVerifyFiles(
  root: string,
  pattern?: string | string[],
  ignore?: string[],
) {
  const patterns = Array.isArray(pattern)
    ? pattern
    : [pattern ?? DEFAULT_PATTERN];
  const ignored = ignore ?? DEFAULT_IGNORE;

  const matches = await Promise.all(
    patterns.map((globPattern) =>
      glob(globPattern, {
        cwd: root,
        absolute: true,
        ignore: ignored,
      }),
    ),
  );

  return [...new Set(matches.flat())].sort();
}

function defaultReporter(summary: RepoTestRunSummary, root: string) {
  if (summary.total === 0) {
    console.log("repo-tests: no checks were scheduled.");
    return;
  }

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
    `repo-tests: ${summary.passed}/${summary.total} passed, ${summary.failed} failed in ${formatDuration(summary.durationMs)}`,
  );
}

function relativePath(root: string, target: string) {
  const relative = path.relative(root, target);
  return relative.startsWith("..") ? target : relative || path.basename(target);
}

function indent(text: string, spaces: number) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs.toFixed(0)}ms`;
  }
  return `${(durationMs / 1000).toFixed(2)}s`;
}
