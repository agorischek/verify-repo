import { verify } from "../packages/bundle/src";

verify.script("build").runs();
verify.script("dev").outputs(/ready/);
verify.file("README.md").exists();
