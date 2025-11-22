import { verify } from "./packages/bundle/src";

verify.file("package.json").exists();
verify.file("README.md").exists();
