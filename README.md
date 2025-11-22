# Repo Tests

Unit test the state of a repository without depending on a third-party test runner.

## Define checks

Create files that match `**/*?.verify.{js,ts}`. Each file has access to the shared
`verify` instance:

```ts
// repo.verify.ts
import { verify } from "repo-tests";

verify.file("package.json").exists();
verify.command("npm run build").runs();
verify.git.isClean();
verify.prettier("src/**/*.ts").isFormatted();
verify.with({ message: "release guard" })
  .git.branch("release")
  .isClean();
```

`verify` is a dynamic DSL. Accessing `verify.<plugin>` creates a verification builder. Call exactly one check (`isClean()`, `runs()`, `isFormatted()`, etc.) per builder; if no check is registered the builder throws. Use `verify.with(meta)` to attach metadata that you can read inside your plugins or use to differentiate checks in reports.

Built-in plugins:

- `command("npm run build").runs()` or `.outputs(/ready/)`
- `file("README.md").exists()` / `.contains("Install")`
- `prettier.isFormatted()` or `prettier("src/**/*.ts").isFormatted()`
- `git.isClean()`, `git.branch("main").isCurrent()`
- `ts.noErrors()`, `ts.buildsProject("tsconfig.build.json")`
- `eslint.passes({ maxWarnings: 0 })`
- `docker.builds("Dockerfile.prod", { tag: "my-app:prod" })`

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

Plugins now use `createPluginEntry(builder, methods, callHandler?)`. Each method receives the active `VerificationBuilder` so you can mark the check as registered and call `builder.schedule(description, handler)`:

```ts
import {
  PluginContext,
  createPluginEntry,
  type VerificationBuilder,
} from "@repo-tests/core";

export const hello = () => {
  return ({ root }: PluginContext) => ({
    hello(builder: VerificationBuilder) {
      return createPluginEntry(builder, {
        greets: (_builder, name: string) => {
          builder.schedule(`says hello to ${name}`, async ({ pass }) => {
            pass(`Hello, ${name}! (from ${root ?? process.cwd()})`);
          });
        },
      });
    },
  });
};
```

Use `builder.createChild(meta)` inside call handlers to support selectors (e.g. `verify.hello("world").greets()`).