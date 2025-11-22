import { verify } from "../../../packages/bundle/src";

verify.file("README.md").exists();
// verify.script("build").runs();
// verify.script("dev").outputs(/ready/);
