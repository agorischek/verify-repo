import { verify } from "../../../packages/bundle/src";

verify.file("README.md").exists();
// verify.command("npm run build").runs();
// verify.command("npm run dev").outputs(/ready/);
