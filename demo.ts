#!/usr/bin/env bun

/**
 * Demo script showing how to use the run() function from repo-tests
 * 
 * This script demonstrates:
 * - Running verify files with default settings
 * - Custom pattern matching
 * - Custom reporter
 * - Error handling
 */

import { run, RepoTestsFailedError } from "./packages/bundle/src";

async function main() {
  console.log("🚀 Running repo-tests demo...\n");

  try {
    // Example 1: Run with default settings (finds **/*.verify.{js,ts})
    console.log("📋 Example 1: Running with default settings");
    try {
      const summary1 = await run({
        root: process.cwd(),
      });
      console.log(`✅ Completed: ${summary1.passed} passed, ${summary1.failed} failed\n`);
    } catch (error) {
      if (error instanceof RepoTestsFailedError) {
        console.log(`⚠️  Some tests failed: ${error.summary.failed}/${error.summary.total} failed\n`);
      } else {
        throw error;
      }
    }

    // Example 2: Run with custom pattern (only root verify file)
    console.log("📋 Example 2: Running with custom pattern (repo.verify.ts only)");
    try {
      const summary2 = await run({
        pattern: "repo.verify.ts",
        root: process.cwd(),
      });
      console.log(`✅ Completed: ${summary2.passed} passed, ${summary2.failed} failed\n`);
    } catch (error) {
      if (error instanceof RepoTestsFailedError) {
        console.log(`⚠️  Some tests failed: ${error.summary.failed}/${error.summary.total} failed\n`);
      } else {
        throw error;
      }
    }

    // Example 3: Run with custom reporter (silent default, custom output)
    console.log("📋 Example 3: Running with custom reporter");
    const summary3 = await run({
      pattern: "repo.verify.ts",
      reporter: (summary) => {
        console.log("📊 Custom Report:");
        console.log(`   Total: ${summary.total}`);
        console.log(`   Passed: ${summary.passed}`);
        console.log(`   Failed: ${summary.failed}`);
        console.log(`   Duration: ${(summary.durationMs / 1000).toFixed(2)}s`);
        console.log("\n   Results:");
        summary.results.forEach((result) => {
          const icon = result.status === "passed" ? "✅" : "❌";
          const source = result.source ? ` (${result.source.split("/").pop()})` : "";
          console.log(`   ${icon} [${result.status}] ${result.description}${source}`);
        });
      },
    });
    console.log("");

    // Example 4: Run with concurrency limit and silent reporter
    console.log("📋 Example 4: Running with concurrency limit (silent reporter)");
    const summary4 = await run({
      concurrency: 2,
      pattern: "repo.verify.ts",
      reporter: false, // Silent - no output
    });
    console.log(`✅ Completed silently: ${summary4.passed} passed, ${summary4.failed} failed\n`);

    console.log("🎉 All demos completed successfully!");

  } catch (error) {
    if (error instanceof RepoTestsFailedError) {
      console.error(`\n❌ RepoTestsFailedError: ${error.message}`);
      console.error(`   Failed: ${error.summary.failed}/${error.summary.total}`);
      process.exit(1);
    } else if (error instanceof Error) {
      console.error("❌ Error:", error.message);
      if ("cause" in error && error.cause) {
        console.error("   Cause:", error.cause);
      }
      process.exit(1);
    } else {
      console.error("❌ Unknown error:", error);
      process.exit(1);
    }
  }
}

main();

