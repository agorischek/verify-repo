import { verify } from "verify-repo";

verify.file("package.json").exists();
verify.file("README.md").exists();
verify.ts.builds();