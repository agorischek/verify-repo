import { test, expect } from "bun:test";
import { RepoTests } from "@repo-tests/core";
import { script } from "@repo-tests/plugin-script";
import { file } from "@repo-tests/plugin-file";

const fixturePath = `${import.meta.dir}/fixtures/my-app`;

export const verify = new RepoTests({
  test,
  expect,
  plugins: [script(), file()],
  root: fixturePath,
});
