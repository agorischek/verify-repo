import { collectDocs as engineCollectDocs, type PluginDocumentation, type RepoPlugin } from "@verify-repo/engine";
import type { RepoVerifierConfig, DocsOptions } from "@verify-repo/cli";
import { fs } from "packages/plugins/fs/src";
import { command } from "@verify-repo/plugin-command";
import { prettier } from "@verify-repo/plugin-prettier";
import { git } from "@verify-repo/plugin-git";
import { ts as tsPlugin } from "@verify-repo/plugin-ts";
import { eslint as eslintPlugin } from "@verify-repo/plugin-eslint";
import { bun as bunPlugin } from "@verify-repo/plugin-bun";
import { docker } from "@verify-repo/plugin-docker";
import { pkg } from "@verify-repo/plugin-package";

const builtInPlugins: RepoPlugin[] = [
  fs(),
  command(),
  prettier(),
  git(),
  tsPlugin(),
  eslintPlugin(),
  bunPlugin(),
  docker(),
  pkg(),
];

export function collectDocs(config: RepoVerifierConfig = {}): PluginDocumentation[] {
  const { plugins = [] } = config;
  const allPlugins = [...builtInPlugins, ...plugins];
  return engineCollectDocs(allPlugins);
}

export function printDocs(options: DocsOptions = {}) {
  const { writer, ...config } = options;
  const docs = collectDocs(config);
  const log = writer ?? ((line: string) => console.log(line));

  if (docs.length === 0) {
    log("verify-repo: no plugin documentation is available.");
    return docs;
  }

  log("verify-repo: available plugin APIs");
  log("");

  const sections = docs.slice().sort((a, b) => a.name.localeCompare(b.name));
  sections.forEach((doc, index) => {
    log(doc.description ? `${doc.name} — ${doc.description}` : doc.name);
    doc.entries.forEach((entry) => {
      log(`  ${entry.signature}`);
      if (entry.description) {
        entry.description.split("\n").forEach((line) => {
          log(`    ${line.trimEnd()}`);
        });
      }
    });
    if (index < sections.length - 1) {
      log("");
    }
  });

  return docs;
}
