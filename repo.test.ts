import { verify, configure } from "./packages/bundle/src";
import { test, expect } from "bun:test";

configure({ test, expect });

verify.file("package.json").exists();
verify.file("hey.txt").exists();
verify.prettier();

verify.git.isClean();
verify.git.hasNoConflicts();
verify.git.isOnBranch("main");
