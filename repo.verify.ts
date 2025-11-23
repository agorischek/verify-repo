import { verify } from "verify-repo";

// Repository structure stays intact
verify.file("package.json").exists();
verify.file("README.md").contains("# verify-repo");
verify.file("verify.config.ts").contains('packageManager: "bun"');
verify.file("tsconfig.json").exists();
verify.file("bun.lockb").exists();
verify.file("bun.lock").not.exists();
verify.dir("packages/bundle/dist").exists();
verify.dir("packages/plugins").exists();

verify.dir("dev").not.exists();

// Code quality gates
verify.prettier.isFormatted();

verify.ts.noErrors();
verify.ts.builds();

// Critical scripts and docs
verify.command("bun test tests/docs.test.ts").runs();
verify.script("verify:docs").outputs(/available plugin APIs/);

// Repo hygiene
verify.git.hasNoConflicts();
