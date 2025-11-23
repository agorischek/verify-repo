<img src="https://raw.githubusercontent.com/agorischek/verify-repo/refs/heads/main/static/logo.png" alt="verify-repo logo" width="300">

# verify-repo

[![Version](https://img.shields.io/npm/v/verify-repo)](https://www.npmjs.com/package/verify-repo "Version") [![Workflow](https://img.shields.io/github/actions/workflow/status/agorischek/repo-tests/.github/workflows/ci.yml)](https://github.com/agorischek/repo-tests/actions/workflows/.github/workflows/ci.yml "Workflow") [![License](https://img.shields.io/github/license/agorischek/repo-tests)](https://github.com/agorischek/repo-tests/blob/main/LICENSE "License") [![Badges](https://img.shields.io/badge/badges-rolled-white)](https://github.com/agorischek/badge-roll "Badges")

Test the state of your repository. Make your coding agents prove they're done.

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

You can extend `verify-repo` with custom checks by creating a plugin. A plugin is a function that returns a `RepoPlugin` object, usually created via the `plugin` helper.

Key concepts:

- **`name` / `description`**: Metadata for the plugin.
- **`docs`**: Documentation for the checks provided by the plugin (shown in `--docs`).
- **`api`**: A function that returns the API extensions. It receives a `VerificationContext` containing:
  - `dir`: The current working directory for the check.
  - `register`: A function to register a new check.
  - `entry`: A helper to create a chainable API (e.g. `verify.myPlugin.check(...)`).

Here is an example of a custom plugin that checks for content in the `README.md` file:

```ts
export const readme = () =>
  plugin({
    name: "README checker",
    description: "Checks for contents in the README file.",
    docs: [
      {
        signature: 'verify.readme.contains("content")',
        description: "Checks that the README file contains the specified content.",
      },
    ],
    api: () => ({
      readme: ({ dir, entry, register }) =>
        entry({
          contains: (content: string) => {
            register(`README contains ${content}`, async ({ pass, fail }) => {
              const file = await readFile(path.join(dir, "README.md"));
              if (file.includes(content)) pass(`README contains "${content}"`);
              else fail(`README does not contain "${content}"`);
            });
          },
        }),
    }),
  });
```

To use your custom plugin, add it to `verify.config.ts`:

```ts
import { configure } from "verify-repo";
import { readme } from "./plugins/readme";

configure({
  plugins: [readme()],
});
```

Now you can use it in your verification files:

```ts
// repo.verify.ts
verify.readme.contains("Getting Started");
```
