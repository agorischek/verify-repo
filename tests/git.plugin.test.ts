import { test, beforeAll, afterAll, expect } from "bun:test";
import simpleGit from "simple-git";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { run } from "../packages/bundle/src";

const TEST_DIR = path.join(process.cwd(), "tmp-git-test");
const VERIFY_FILE = path.join(TEST_DIR, "repo.verify.ts");
const PACKAGE_SRC = path.join(process.cwd(), "packages/bundle/src");

beforeAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
  const git = simpleGit(TEST_DIR);
  await git.init();

  await git.addConfig("user.name", "Test User");
  await git.addConfig("user.email", "test@example.com");

  await writeFile(path.join(TEST_DIR, "clean.txt"), "hello");
  await git.add(".");
  await git.commit("Initial commit");

  await ensureMainBranch(git);

  const relativeImport = path
    .relative(TEST_DIR, PACKAGE_SRC)
    .split(path.sep)
    .join("/");
  const importPath = relativeImport.startsWith(".")
    ? relativeImport
    : `./${relativeImport}`;

  await writeFile(
    VERIFY_FILE,
    `
import { verify } from "${importPath}";

verify.git.isClean();
verify.git.hasNoConflicts();
verify.git.isOnBranch("main");
`.trimStart(),
  );

  await git.add("repo.verify.ts");
  await git.commit("Add repo verify checkpoints");
});

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

test("git plugin reports clean repository state", async () => {
  let summary;
  try {
    summary = await run({
      root: TEST_DIR,
      pattern: ["repo.verify.ts"],
      reporter: false,
    });
  } catch (error) {
    if (error && typeof error === "object" && "summary" in error) {
      console.error("git plugin summary:", (error as any).summary);
    }
    throw error;
  }

  expect(summary.failed).toBe(0);
  expect(summary.passed).toBeGreaterThanOrEqual(3);
});

async function ensureMainBranch(git: ReturnType<typeof simpleGit>) {
  try {
    await git.checkout("main");
  } catch {
    await git.checkoutLocalBranch("main");
  }
}
