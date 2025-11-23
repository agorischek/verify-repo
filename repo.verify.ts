import { verify } from "verify-repo";

verify.file("package.json").exists();
verify.file("README.md").exists();
verify.ts.builds();
verify.prettier.isFormatted();
verify.file("bun.lockb").exists();
verify.file("bun.lock").not.exists();
verify.dir("dev").not.exists();
