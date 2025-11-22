# Repo Tests

Unit test your repo state. Great for helping coding agents prove they're "done" with a task.

```ts
import { file } from "@repo-tests/plugin-file";
import { RepoTests } from "../packages/core/src";
import { scripts } from "../packages/plugins/scripts/src";
import { expect, test } from "bun:test";

const verify = new RepoTests({
  plugins: [scripts(), file()],
  test,
  expect,
});

verify.file("package.jsonn").exists();
```