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
verify.script("dev").runs();
verify.git.isClean();
verify.prettier("src/**/*.ts").isFormatted();
```

### Built-in plugins

- `command("npm run build").runs()` or `.outputs(/ready/)`
- `script("dev").runs()`
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

Plugins define methods that register verifications using `context.register`. You can use the `context.entry` helper to simplify wrapping methods:

```ts
import { plugin } from "verify-repo";

export const hello = () =>
  plugin({
    name: "Hello",
    description: "A friendly plugin.",
    docs: [
      {
        signature: 'verify.hello.greets("name")',
        description: "Checks that the hello greeting is received.",
      },
    ],
    api: ({ root }) => ({
      hello: ({ entry, register }) =>
        entry({
          greets: (name: string) => {
            register(`says hello to ${name}`, async ({ pass }) => {
              pass(`Hello, ${name}! (from ${root ?? process.cwd()})`);
            });
          },
        }),
    }),
  });
```
