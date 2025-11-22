import { verify, configure } from "../packages/bundle/src";
import { test, expect, beforeAll, afterAll } from "bun:test";
import simpleGit from "simple-git";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";

const TEST_DIR = join(process.cwd(), "tmp-git-test");

configure({ test, expect, root: TEST_DIR });

// Setup environment
const git = simpleGit(TEST_DIR);

beforeAll(async () => {
  // Clean up previous run if any
  await rm(TEST_DIR, { recursive: true, force: true });

  await mkdir(TEST_DIR, { recursive: true });
  await git.init();
  // Check branch name
  const status = await git.status();
  const currentBranch = status.current;

  await git.addConfig("user.name", "Test User");
  await git.addConfig("user.email", "test@example.com");

  await writeFile(join(TEST_DIR, "clean.txt"), "hello");
  await git.add(".");
  await git.commit("Initial commit");

  // Ensure we are on the expected branch
  if (currentBranch !== "main" && currentBranch !== "master") {
    await git.checkoutLocalBranch("main");
  }
});

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

// These define tests that will run after beforeAll
verify.git.isClean();
verify.git.hasNoConflicts();
// We can't easily test isOnBranch without knowing the default branch name deterministically,
// but we can try 'master' or 'main'. git init usually uses 'master' or 'main'.
// I'll check status in beforeAll but I can't pass it to verify easily here as it runs at define time.
// But wait, verify functions run `test(...)` which passes a callback. The callback runs LATER.
// So the check happens at runtime.
// But the argument to `isOnBranch` is passed at define time.
// So I must know the branch name.
// I'll force branch to 'main' in beforeAll.
verify.git.isOnBranch("main");

// Test hasStaged with a staged file
// This requires a separate test scenario where we have staged files.
// But verify.git.isClean() expects clean.
// If I modify state, isClean might fail.
// The tests run in parallel or sequence? Bun tests run in parallel by default?
// RepoTests wrapper might not handle state changes between tests well if they expect different states.
// However, I can add a test that creates a staged file, then checks it?
// But `verify` API is declarative.

// For now let's just verify the clean state.
