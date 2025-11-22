import { verify } from "./verify";

verify.script("build").runs();
verify.script("dev").outputs(/ready/);
verify.file("README.md").exists();
