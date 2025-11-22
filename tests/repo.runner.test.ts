import { test, expect } from "bun:test";
import path from "node:path";
import { writeFile, rm } from "node:fs/promises";
import { run, RepoVerificationFailedError } from "../packages/bundle/src";

const fixtureRoot = path.join(import.meta.dir, "fixtures/my-app");

test("runs repo verify files and succeeds", async () => {
  const summary = await run({
    root: fixtureRoot,
    pattern: ["repo.verify.ts"],
    reporter: false,
  });

  expect(summary.failed).toBe(0);
  expect(summary.passed).toBeGreaterThan(0);
});

test("reports failures when checks do not pass", async () => {
  const failingFile = path.join(fixtureRoot, "missing-file.verify.ts");
  await writeFile(
    failingFile,
    `
import { verify } from "../../../packages/bundle/src";
verify.file("totally-missing.txt").exists();
`.trimStart(),
  );

  try {
    await expect(
      run({
        root: fixtureRoot,
        pattern: ["*.verify.ts"],
        reporter: false,
      }),
    ).rejects.toThrow(RepoVerificationFailedError);
  } finally {
    await rm(failingFile, { force: true });
  }
});
