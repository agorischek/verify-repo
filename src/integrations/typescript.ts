import * as ts from "typescript";
import * as fs from "fs/promises";
import * as path from "path";
import type { RepoTests } from "../core";

export function createTypeScriptIntegration(repo: RepoTests) {
  const repoRoot = repo.getRepoRoot();

  async function findTsConfig(): Promise<{ path: string; config: any } | null> {
    let currentDir = repoRoot;
    while (currentDir !== path.dirname(currentDir)) {
      const tsconfigPath = path.join(currentDir, "tsconfig.json");
      try {
        await fs.access(tsconfigPath);
        const content = await fs.readFile(tsconfigPath, "utf8");
        const config = ts.parseConfigFileTextToJson(tsconfigPath, content);
        return { path: tsconfigPath, config: config.config };
      } catch {
        // Continue searching
      }
      currentDir = path.dirname(currentDir);
    }
    return null;
  }

  const tsIntegration: any = function () {
    repo.register("typescript: project typechecks", async () => {
      const tsconfig = await findTsConfig();
      if (!tsconfig) {
        throw new Error("No tsconfig.json found");
      }

      const config = ts.parseJsonConfigFileContent(
        tsconfig.config,
        ts.sys,
        path.dirname(tsconfig.path)
      );

      const program = ts.createProgram(config.fileNames, config.options);
      const diagnostics = ts.getPreEmitDiagnostics(program);
      expect(diagnostics).toHaveNoTypeErrors();
    });
  };

  tsIntegration.typechecks = tsIntegration;

  tsIntegration.builds = function () {
    repo.register("typescript: project builds", async () => {
      const tsconfig = await findTsConfig();
      if (!tsconfig) {
        throw new Error("No tsconfig.json found");
      }

      const config = ts.parseJsonConfigFileContent(
        tsconfig.config,
        ts.sys,
        path.dirname(tsconfig.path)
      );

      const program = ts.createProgram(config.fileNames, config.options);
      const diagnostics = ts.getPreEmitDiagnostics(program);
      expect(diagnostics).toHaveNoTypeErrors();
    });
  };

  tsIntegration.file = function (filePath: string) {
    return {
      typechecks() {
        repo.register(`typescript: ${filePath} typechecks`, async () => {
          const fullPath = path.resolve(repoRoot, filePath);
          const program = ts.createProgram([fullPath], {
            noEmit: true,
            skipLibCheck: true,
          });
          const diagnostics = ts.getPreEmitDiagnostics(program);
          expect(diagnostics).toHaveNoTypeErrors();
        });
      },

      hasNoDiagnostics() {
        repo.register(`typescript: ${filePath} has no diagnostics`, async () => {
          const fullPath = path.resolve(repoRoot, filePath);
          const program = ts.createProgram([fullPath], {
            noEmit: true,
            skipLibCheck: true,
          });
          const diagnostics = ts.getPreEmitDiagnostics(program);
          expect(diagnostics).toHaveNoTypeErrors();
        });
      },
    };
  };

  return tsIntegration;
}
