<img src="static/logo.png" alt="verify-repo logo" width="300">

# verify-repo

Test the state of your repository. Great for having coding agents prove they're done.

## Define checks

Create files that match `**/*?.verify.{js,ts}`. Each file has access to the shared
`verify` instance:

```ts
// repo.verify.ts
import { verify } from "verify-repo";

verify.file("package.json").exists();
verify.dir("dist").exists();
verify.command("npm run build").runs();
verify.git.isClean();
verify.prettier("src/**/*.ts").isFormatted();
```

### Built-in plugins

- `command("npm run build").runs()` or `.outputs(/ready/)`
- `file("README.md").exists()` / `.contains("Install")`
- `dir("dist").exists()` / `dir("node_modules").not.exists()`
- `prettier.isFormatted()` or `prettier("src/**/*.ts").isFormatted()`
- `git.isClean()`, `git.branch("main").isCurrent()`
- `ts.noErrors()`, `ts.buildsProject("tsconfig.build.json")`
- `eslint.passes({ maxWarnings: 0 })`
- `bun.test.passes({ args: ["--filter", "unit"] })`
- `docker.builds("Dockerfile.prod", { tag: "my-app:prod" })`

## Run

You can run the verifications using the CLI:

```bash
npx verify-repo
```

Or programmatically:

```ts
import { run } from "verify-repo";

await run({
  root: process.cwd(), // default
  // pattern, ignore, plugins, etc. are optional overrides
});
```

`run` discovers every `*.verify.ts`/`*.verify.js` file, loads them, and executes all
checks in parallel. A non-zero exit (or thrown `RepoVerificationFailedError`) indicates a failure.

## Explore available checks

To see a list of all available checks and their documentation, run:

```bash
npx verify-repo --docs
```

## Configuration

You can configure the runtime using `verify.config.ts` in the root of your project:

```ts
// verify.config.ts
import { configure } from "verify-repo";

configure({
  root: process.cwd(),
  // Add custom plugins or override defaults here
  concurrency: 5,
});
```

## Authoring plugins

Plugins use `new PluginEntry(builder, methods, callHandler?)`. Each method receives the active `VerificationBuilder` so you can mark the check as registered and call `builder.schedule(description, handler)`:

```ts
import {
  PluginContext,
  PluginEntry,
  type RepoPlugin,
  type VerificationBuilder,
} from "verify-repo";

export const hello = (): RepoPlugin => ({
  name: "Hello",
  description: "A friendly plugin.",
  docs: [
    {
      signature: 'verify.hello("name").greets()',
      description: "Checks that the hello greeting is received.",
    },
  ],
  api: ({ root }: PluginContext) => ({
    hello(builder: VerificationBuilder) {
        return new PluginEntry(builder, {
          greets: (_builder, name: string) => {
            builder.schedule(`says hello to ${name}`, async ({ pass }) => {
              pass(`Hello, ${name}! (from ${root ?? process.cwd()})`);
            });
          },
        });
      },
    }),
  },
});
```

Use `builder.createChild(meta)` inside call handlers to support selectors (e.g. `verify.hello("world").greets()`).
