import { test, expect, beforeAll, afterAll } from "bun:test";
import path from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { run } from "../packages/bundle/src";

const testRoot = path.join(import.meta.dir, "fixtures/relative-test");

beforeAll(async () => {
  await mkdir(path.join(testRoot, "nested"), { recursive: true });
  await writeFile(path.join(testRoot, "nested", "target.txt"), "hello");
  await writeFile(
    path.join(testRoot, "nested", "check.verify.ts"),
    `
import { verify } from "../../../../packages/bundle/src";

verify.file("target.txt").exists();
    `.trim(),
  );
});

afterAll(async () => {
  await rm(testRoot, { recursive: true, force: true });
});

test("verification checks run relative to the directory of the .verify.ts file", async () => {
  const summary = await run({
    root: testRoot,
    pattern: "**/*.verify.ts",
    reporter: false,
  });

  expect(summary.failed).toBe(0);
  expect(summary.passed).toBe(1);
});
