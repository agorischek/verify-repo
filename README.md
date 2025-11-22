# Repo Tests

Unit test the state of a repository without depending on a third-party test runner.

## Define checks

Create files that match `**/*?.verify.{js,ts}`. Each file has access to the shared
`verify` instance:

```ts
// repo.verify.ts
import { verify } from "repo-tests";

verify.file("package.json").exists();
verify.script("build").runs();
verify.git.isClean();
```

## Run them

```ts
import { run } from "repo-tests";

await run({
  root: process.cwd(), // default
  // pattern, ignore, plugins, etc. are optional overrides
});
```

`run` discovers every `*.verify.ts`/`*.verify.js` file, loads them, and executes all
checks in parallel. A non-zero exit (or thrown `RepoTestsFailedError`) indicates a failure.

## Authoring plugins

Plugins now receive `schedule(description, handler)`. Each handler gets `pass`
and `fail` helpers so you can report rich status messages:

```ts
import { PluginContext } from "@repo-tests/core";

export const myPlugin = () => ({ schedule }: PluginContext) => ({
  hello(name: string) {
    schedule(`says hello to ${name}`, async ({ pass }) => {
      pass(`Hello, ${name}!`);
    });
  },
});
```
