/**
 * Example usage of RepoTests
 */

import { RepoTests } from "./src/index";
import { describe } from "vitest";

const repo = new RepoTests();

describe("Repo health", () => {
  // TypeScript checks
  repo.ts();
  repo.ts.typechecks();
  repo.ts.builds();

  // ESLint checks
  repo.eslint();
  repo.eslint.passes();

  // Prettier checks
  repo.prettier();
  repo.prettier.formats();

  // Git checks
  repo.git();
  repo.git.isClean();
  repo.git.hasNoConflicts();

  // File checks
  repo.file("README.md").exists();
  repo.file("README.md").contains("RepoTests");
  repo.file("package.json").json().hasKey("name");

  // Directory checks
  repo.dir("src").exists();
  repo.dir("dist").doesNotExist();

  // Process checks
  repo.process.script("build").runs();
  // repo.process.script("dev").bootsWhen(/ready/i);
});
