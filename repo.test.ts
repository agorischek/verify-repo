import { test, expect } from "bun:test";
import { run } from "./packages/bundle/src";

test("repo verify file passes", async () => {
  const summary = await run({
    root: process.cwd(),
    pattern: ["repo.verify.ts"],
    reporter: false,
  });

  expect(summary.failed).toBe(0);
  expect(summary.passed).toBeGreaterThan(0);
});
