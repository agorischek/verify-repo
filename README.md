# Repo Tests

Unit test your repo state. Great for helping coding agents prove they're "done" with a task.

```ts
import { file } from "@repo-tests/plugin-file";
import { RepoTesterBase } from "../packages/core/src";
import { script } from "../packages/plugins/script/src";
import { expect, test } from "bun:test";

const verify = new RepoTesterBase({
  plugins: [script(), file()],
  test,
  expect,
});

verify.file("package.jsonn").exists();
```
