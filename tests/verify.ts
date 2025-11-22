import { test, expect } from "bun:test";
import { RepoTests } from "@repo-tests/core";
import { scripts } from "@repo-tests/plugin-scripts";
import { file } from "@repo-tests/plugin-file";

const fixturePath = `${import.meta.dir}/fixtures/my-app`;

export const verify = new RepoTests({
  test,
  expect,
  plugins: [scripts(), file()],
  root: fixturePath,
});
