import { test, beforeAll, afterAll, expect } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { run } from "../packages/bundle/src";

const TEST_DIR = path.join(process.cwd(), "tmp-bun-plugin-test");
const VERIFY_FILE = path.join(TEST_DIR, "repo.verify.ts");
const PACKAGE_SRC = path.join(process.cwd(), "packages/bundle/src");

beforeAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });

  const relativeImport = path
    .relative(TEST_DIR, PACKAGE_SRC)
    .split(path.sep)
    .join("/");
  const importPath = relativeImport.startsWith(".")
    ? relativeImport
    : `./${relativeImport}`;

  await writeFile(
    path.join(TEST_DIR, "package.json"),
    JSON.stringify(
      {
        name: "bun-plugin-fixture",
        type: "module",
      },
      null,
      2,
    ),
  );

  await writeFile(
    path.join(TEST_DIR, "math.test.ts"),
    `
import { expect, test } from "bun:test";

test("math still works", () => {
  expect(2 + 2).toBe(4);
});
`.trimStart(),
  );

  await writeFile(
    VERIFY_FILE,
    `
import { verify } from "${importPath}";

verify.bun.test.passes();
`.trimStart(),
  );
});

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

test("bun plugin executes bun test successfully", async () => {
  const summary = await run({
    root: TEST_DIR,
    pattern: ["repo.verify.ts"],
    reporter: false,
  });

  expect(summary.failed).toBe(0);
  expect(summary.passed).toBeGreaterThanOrEqual(1);
});
