import path from "node:path";
import { pathToFileURL } from "node:url";
import { access } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { glob } from "glob";
import type { RepoTestRunSummary } from "@verify-repo/engine";
import { RepoVerifierConfig } from "./RepoVerifierConfig";
import { configure, getVerifyInstance, normalizeRoot } from "./verify";
import { RepoVerificationFailedError } from "./errors";

const DEFAULT_PATTERN = "**/*?.verify.{js,ts}";
const DEFAULT_IGNORE = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"];

export interface RunOptions extends RepoVerifierConfig {
  pattern?: string | string[];
  ignore?: string[];
  /**
   * Provide a custom reporter. Set to false to silence output.
   */
  reporter?: false | ((summary: RepoTestRunSummary) => void);
  /**
   * Enable verbose output. When false (default), only shows failures or a success message.
   */
  verbose?: boolean;
  /**
   * Start time from performance.now() for measuring total CLI duration.
   */
  startTime?: number;
}

async function loadConfigFile(root: string): Promise<void> {
  const configPaths = [path.join(root, "verify.config.ts"), path.join(root, "verify.config.js")];

  for (const configPath of configPaths) {
    try {
      await access(configPath);
      // Config file exists, import it (which will execute configure() if it calls it)
      const configUrl = pathToFileURL(configPath).href;
      await import(configUrl);
      return; // Successfully loaded, exit
    } catch (error) {
      // If it's a file not found error, try next path
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      // For other errors (like import errors), throw them
      throw error;
    }
  }
}

export async function run(options: RunOptions = {}) {
  const root = normalizeRoot(options.root) ?? process.cwd();

  // Load config file first if it exists (it calls configure() to set up the instance)
  try {
    await loadConfigFile(root);
  } catch (error) {
    throw new Error(`Failed to load verify.config.ts: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    });
  }

  // Get the current instance (may have been configured by verify.config.ts)
  let verifyInstance = getVerifyInstance();

  // If options are provided, reconfigure (options override config file settings)
  // The config file mutates the instance in place, and options can override
  if (
    options.root !== undefined ||
    options.plugins !== undefined ||
    options.concurrency !== undefined ||
    options.packageManager !== undefined
  ) {
    const existingInstance = verifyInstance;
    const mergedConfig: RepoVerifierConfig = {
      // Preserve root from config file if not overridden
      root: normalizeRoot(options.root) ?? existingInstance.root ?? root,
      // Options explicitly provided override config file
      plugins: options.plugins,
      concurrency: options.concurrency,
      packageManager: options.packageManager,
    };
    verifyInstance = configure(mergedConfig);
  }

  const files = await discoverVerifyFiles(root, options.pattern, options.ignore);
  const verbose = options.verbose ?? false;
  if (verbose) {
    console.log(`verify-repo: discovered ${files.length} verify file${files.length === 1 ? "" : "s"}`);
  }
  const runtimeTag = Date.now().toString(36);

  for (const file of files) {
    await verifyInstance.withFileScope(file, async () => {
      try {
        const fileUrl = pathToFileURL(file);
        fileUrl.search = `?run=${runtimeTag}-${Math.random().toString(36).slice(2)}`;
        await import(fileUrl.href);
      } catch (error) {
        throw new Error(`Failed to load verify file at ${relativePath(root, file)}`, { cause: error });
      }
    });
  }

  const verificationCount = verifyInstance.plannedTests;
  if (verbose) {
    console.log(`verify-repo: registered ${verificationCount} verification${verificationCount === 1 ? "" : "s"}`);
  }

  // Convert boolean concurrency to number: true = unlimited (Infinity), false = sequential (1)
  const runConcurrency: number | undefined =
    typeof options.concurrency === "boolean"
      ? options.concurrency
        ? Number.POSITIVE_INFINITY
        : 1
      : options.concurrency;

  const summary = await verifyInstance.run({
    concurrency: runConcurrency,
  });

  const totalDurationMs = options.startTime !== undefined ? performance.now() - options.startTime : undefined;
  const reporter =
    options.reporter === false
      ? null
      : (options.reporter ?? ((result) => defaultReporter(result, root, verbose, totalDurationMs)));
  reporter?.(summary);

  if (summary.failed > 0) {
    throw new RepoVerificationFailedError(summary);
  }

  return summary;
}

async function discoverVerifyFiles(root: string, pattern?: string | string[], ignore?: string[]) {
  const patterns = Array.isArray(pattern) ? pattern : [pattern ?? DEFAULT_PATTERN];
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

function defaultReporter(
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
