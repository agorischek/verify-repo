import { verify } from "../packages/bundle/src";

verify.command("npm run build").runs();
verify.command("npm run dev").outputs(/ready/);
verify.file("README.md").exists();
