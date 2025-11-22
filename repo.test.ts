import { create } from "./packages/bundle/src";
import { test, expect } from "bun:test";

const verify = create({ test, expect });

verify.file("package.json").exists();
