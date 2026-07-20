<img src="https://raw.githubusercontent.com/agorischek/verify-repo/refs/heads/main/static/logo.png" alt="verify-repo logo" width="300">

# verify-repo

[![Version](https://img.shields.io/npm/v/verify-repo)](https://www.npmjs.com/package/verify-repo "Version") [![Workflow](https://img.shields.io/github/actions/workflow/status/agorischek/verify-repo/.github/workflows/ci.yml)](https://github.com/agorischek/verify-repo/actions/workflows/.github/workflows/ci.yml "Workflow") [![License](https://img.shields.io/github/license/agorischek/verify-repo)](https://github.com/agorischek/verify-repo/blob/main/LICENSE "License") [![Badges](https://img.shields.io/badge/badges-rolled-white)](https://github.com/agorischek/badge-roll "Badges")

Test the state of your repository. Make your coding agents prove they're done.

```ts
// repo.verify.ts
import { verify } from "verify-repo";

verify.file("package.json").exists();
verify.dir("dist").exists();
verify.script("dev").runs();
verify.git.isClean();
verify.prettier("src/**/*.ts").isFormatted();
```

See [package README](./packages/bundle/README.md) for details.

## Releasing

Releases are built, tested, and published from GitHub Actions with npm trusted
publishing. After merging a version bump to `main`, push the matching tag (for
example, `v0.0.3`). The publish workflow verifies that the tag matches the
package version, publishes `verify-repo` with provenance, and creates the
corresponding GitHub release.
