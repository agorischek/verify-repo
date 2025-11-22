import { verify } from "./packages/bundle/src";
import { test, expect } from "bun:test";

verify.with({ test, expect });

verify.file("package.json").exists();
verify.file("bun.lock").exists();
verify.prettier();
verify.script("build").runs();
