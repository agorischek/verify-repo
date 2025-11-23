import type { PluginDocumentation } from "@verify-repo/engine";
import { RepoVerificationRuntime } from "./RepoVerificationRuntime";
import type { RepoVerifierConfig } from "./RepoVerifierConfig";

export interface DocsOptions extends RepoVerifierConfig {
  writer?: (line: string) => void;
}

export function collectDocs(config: RepoVerifierConfig = {}): PluginDocumentation[] {
  const runtime = new RepoVerificationRuntime(config);
  return runtime.getPluginDocumentation();
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
