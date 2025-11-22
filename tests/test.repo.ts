import { describe, test, expect } from "bun:test";
import { RepoTests } from "@repo-tests/core";
import { scripts } from "@repo-tests/plugin-scripts";
import { file } from "@repo-tests/plugin-file";

// Setting the CWD to the fixture app so the scripts plugin runs commands there
const fixturePath = `${import.meta.dir}/fixtures/my-app`;
process.chdir(fixturePath);

describe("RepoTests Integration", () => {
  const verify = new RepoTests({
    test,
    expect,
    plugins: [
      scripts(),
      file()
    ]
  });

  describe("scripts", () => {
    verify.script("build").runs();
    verify.script("dev").outputs(/ready/);
  });

  describe("scripts", () => {
    verify.file("package.json").exists();
  });
});
