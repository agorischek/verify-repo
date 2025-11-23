<img src="https://raw.githubusercontent.com/agorischek/verify-repo/refs/heads/main/static/logo.png" alt="verify-repo logo" width="300">

# verify-repo

Test the state of your repository. Make your coding agents prove they're done.

```ts
import { verify } from "verify-repo";

verify.file("package.json").exists();
verify.dir("dist").exists();
verify.script("dev").runs();
verify.git.isClean();
verify.prettier("src/**/*.ts").isFormatted();
```

See [package README](./packages/bundle/README.md) for details.
