# RepoTests

RepoTests is a library that provides declarative, synchronous API calls that register tests about the state of a code repository. None of the RepoTests API methods run checks directly. They only register tests with the underlying test runner (Jest, Vitest, Bun test). When executed, each registered test runs asynchronous logic and uses custom matchers for readable, domain-specific error messages.

## Installation

```bash
npm install @repotests/core
```

## Basic Usage

```typescript
import { RepoTests } from "@repotests/core";

const repo = new RepoTests();

describe("Repo health", () => {
  repo.ts();                          // typechecks project
  repo.eslint();                      // eslint passes
  repo.prettier();                    // prettier formatted
  repo.git.isClean();                 // working tree clean

  repo.dir("src").exists();
  repo.dir("temp").doesNotExist();

  repo.file("README.md").contains("Installation");

  repo.process.script("build").runs();
  repo.process.script("dev").bootsWhen(/ready/i);
});
```

## Core Concepts

1. **Synchronous declarative API** — calling RepoTests methods registers tests
2. **Integrations can be callable objects** — `repo.eslint()` works as a function call
3. **Custom matchers** provide rich, readable error messages
4. **Each declarative call expands into a real test block** — `test(name, async () => ...)`
5. **Plugins can add new integrations, verbs, and matchers**

## API Reference

### TypeScript Integration (`repo.ts`)

```typescript
repo.ts();                          // typechecks project
repo.ts.typechecks();               // alias
repo.ts.builds();                   // alias
repo.ts.file("path").typechecks();
repo.ts.file("path").hasNoDiagnostics();
```

### ESLint Integration (`repo.eslint`)

```typescript
repo.eslint();                      // lint passes
repo.eslint.passes();               // alias
repo.eslint.file("x").hasNoErrors();
repo.eslint.files("glob").hasNoErrors();
```

### Prettier Integration (`repo.prettier`)

```typescript
repo.prettier();                    // repo formatted
repo.prettier.formats();            // alias
repo.prettier.file("x").isFormatted();
```

### Git Integration (`repo.git`)

```typescript
repo.git();                         // alias for isClean()
repo.git.isClean();
repo.git.hasNoConflicts();
repo.git.hasStaged("path");
repo.git.isOnBranch("branch");
```

### File Integration (`repo.file`)

```typescript
repo.file("path").exists();
repo.file("path").doesNotExist();
repo.file("path").contains("substring");
repo.file("path").matches(/regex/);
repo.file("path").json().hasKey("scripts.build");
```

### Directory Integration (`repo.dir`)

```typescript
repo.dir("path").exists();
repo.dir("path").doesNotExist();
repo.dir("path").isEmpty();
repo.dir("path").contains("filename");
```

### Process Integration (`repo.process`)

```typescript
repo.process.script("build").runs();
repo.process.script("dev").bootsWhen(/regex/);
repo.process.exec("command").runs();
repo.process.exec("command").outputs(/regex/);
```

## Custom Matchers

RepoTests includes custom matchers for better error formatting:

- `toHaveNoEslintErrors(results)` — checks ESLint results
- `toHaveNoTypeErrors(diagnostics)` — checks TypeScript diagnostics
- `toBeCleanGitStatus(status)` — checks git status
- `toContainSubstring(text, substring)` — substring matching
- `toExist(pathExists)` — file/directory existence
- `toContainLineMatching(output, regex)` — line pattern matching

## Plugin System

You can extend RepoTests with custom integrations:

```typescript
repo.useIntegration({
  name: "docker",

  create(repo) {
    const docker = function () {
      repo.register("docker:default", async () => {
        const running = await dockerIsRunning("default");
        expect(running).toBeRunningDockerContainer();
      });
    };

    docker.container = (name) => ({
      starts() {
        repo.register(`docker:container ${name} starts`, async () => {
          const result = await runDockerContainer(name);
          expect(result).toHaveStartedDockerContainer();
        });
      }
    });

    return docker;
  },

  matchers: {
    toBeRunningDockerContainer(received) {
      return {
        pass: received === true,
        message: () => received
          ? "Expected container NOT to be running"
          : "Expected container to be running"
      };
    },
    toHaveStartedDockerContainer(result) {
      const pass = result.exitCode === 0;
      return {
        pass,
        message: () => pass
          ? "Expected docker start to fail"
          : `Docker start failed: exit code ${result.exitCode}\n${result.stderr}`
      };
    }
  }
});
```

## Type Augmentation

Plugins can extend the RepoTests type using declaration merging:

```typescript
declare module "@repotests/core" {
  interface RepoTestsIntegrations {
    docker: ReturnType<typeof createDockerIntegration>;
  }
}
```

## Requirements

- Node.js 18+
- A test runner that provides global `test()` and `expect()` functions (Jest, Vitest, or Bun test)
- TypeScript 5.0+ (for TypeScript integration)

## License

MIT
