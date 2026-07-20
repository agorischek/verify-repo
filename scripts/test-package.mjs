import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const packageDirectory = path.join(repositoryRoot, "packages", "bundle");
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "verify-repo-package-"));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? temporaryDirectory,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}.\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }

  return result;
}

try {
  const packed = run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", temporaryDirectory], {
    cwd: packageDirectory,
    capture: true,
  });
  const [{ filename }] = JSON.parse(packed.stdout);
  const tarball = path.join(temporaryDirectory, filename);

  await writeFile(
    path.join(temporaryDirectory, "package.json"),
    `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
  );
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball]);

  const installedManifest = JSON.parse(
    await readFile(path.join(temporaryDirectory, "node_modules", "verify-repo", "package.json"), "utf8"),
  );
  assert.equal(installedManifest.peerDependencies, undefined);

  await writeFile(
    path.join(temporaryDirectory, "smoke.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import verify, { run, configure } from "verify-repo";',
      'assert.equal(typeof verify, "object");',
      'assert.equal(typeof verify.with, "function");',
      'assert.equal(typeof run, "function");',
      'assert.equal(typeof configure, "function");',
      "",
    ].join("\n"),
  );
  run(process.execPath, ["smoke.mjs"]);

  await writeFile(
    path.join(temporaryDirectory, "smoke.cjs"),
    [
      'const assert = require("node:assert/strict");',
      'const bundled = require("verify-repo");',
      'assert.equal(typeof bundled.default, "object");',
      'assert.equal(typeof bundled.default.with, "function");',
      'assert.equal(typeof bundled.run, "function");',
      'assert.equal(typeof bundled.configure, "function");',
      "",
    ].join("\n"),
  );
  run(process.execPath, ["smoke.cjs"]);

  const executable = path.join(
    temporaryDirectory,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "verify-repo.cmd" : "verify-repo",
  );
  run(executable, ["--help"]);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
